package com.budgetapp.bridge

import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.regex.Pattern

data class ParsedPaymentResult(
    val isPayment: Boolean,
    val cardCompany: String,
    val amount: Int,
    val merchant: String,
    val dateStr: String,
    val createdAtStr: String,
    val installmentType: String,
    val installmentMonths: Int
)

object FinancialTextParser {

    fun parse(rawBody: String, fallbackTimeMillis: Long = System.currentTimeMillis()): ParsedPaymentResult {
        if (rawBody.isBlank()) {
            return ParsedPaymentResult(false, "", 0, "", "", "", "LUMP_SUM", 1)
        }

        // 0. "광고" 문구가 포함된 메시지는 파싱에서 즉시 제외
        if (rawBody.contains("광고")) {
            return ParsedPaymentResult(false, "", 0, "", "", "", "LUMP_SUM", 1)
        }

        // 1. 카드사 및 승인 문구 체크 (카드사 + 승인/자동결제/결제/접수)
        val hasKeyword = rawBody.contains("승인") || rawBody.contains("자동결제") || rawBody.contains("결제") || rawBody.contains("접수")
        val cardCompany = when {
            rawBody.contains("삼성") -> "삼성카드"
            rawBody.contains("현대") -> "현대카드"
            rawBody.contains("롯데") -> "롯데카드"
            rawBody.contains("신한") -> "신한카드"
            rawBody.contains("국민") || rawBody.contains("KB") -> "국민카드"
            rawBody.contains("하나") -> "하나카드"
            rawBody.contains("우리") -> "우리카드"
            rawBody.contains("농협") || rawBody.contains("NH") -> "NH농협카드"
            rawBody.contains("카카오") -> "카카오뱅크"
            rawBody.contains("카드") -> "기타카드"
            else -> ""
        }

        if (cardCompany.isEmpty() || !hasKeyword) {
            return ParsedPaymentResult(false, "", 0, "", "", "", "LUMP_SUM", 1)
        }

        // 2. 금액 추출 (누적금액 줄은 제외)
        val lines = rawBody.split("\n", "\r").map { it.trim() }.filter { it.isNotBlank() }
        var amount = 0

        val amountPattern = Pattern.compile("([0-9,]+)\\s*원")
        for (line in lines) {
            if (line.contains("누적")) continue // 누적 잔액 줄은 건너뜀
            val matcher = amountPattern.matcher(line)
            if (matcher.find()) {
                val rawAmount = matcher.group(1)?.replace(",", "") ?: "0"
                val parsed = rawAmount.toIntOrNull() ?: 0
                if (parsed > 0) {
                    amount = parsed
                    break
                }
            }
        }

        if (amount <= 0) {
            return ParsedPaymentResult(false, "", 0, "", "", "", "LUMP_SUM", 1)
        }

        // 3. 할부 개월 수 추출
        var installmentType = "LUMP_SUM"
        var installmentMonths = 1
        val installmentPattern = Pattern.compile("(일시불|([0-9]+)개월)")
        val instMatcher = installmentPattern.matcher(rawBody)
        if (instMatcher.find()) {
            val instText = instMatcher.group(1) ?: "일시불"
            if (instText != "일시불") {
                installmentType = "INSTALLMENT"
                installmentMonths = instMatcher.group(2)?.toIntOrNull() ?: 1
            }
        }

        // 4. 날짜 및 시간 파싱 (예: 10/13 11:55 또는 10/12접수 또는 10/12)
        val currentYear = Calendar.getInstance().get(Calendar.YEAR)
        var dateStr = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date(fallbackTimeMillis))
        var createdAtStr = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(Date(fallbackTimeMillis))

        val dateTimePattern = Pattern.compile("([0-9]{1,2})\\/([0-9]{1,2})(?:\\s+([0-9]{1,2}):([0-9]{2}))?")
        val dtMatcher = dateTimePattern.matcher(rawBody)
        if (dtMatcher.find()) {
            val month = dtMatcher.group(1)?.toIntOrNull() ?: 1
            val day = dtMatcher.group(2)?.toIntOrNull() ?: 1
            val hour = dtMatcher.group(3)?.toIntOrNull() ?: 0
            val minute = dtMatcher.group(4)?.toIntOrNull() ?: 0

            dateStr = String.format(Locale.getDefault(), "%04d-%02d-%02d", currentYear, month, day)
            createdAtStr = String.format(Locale.getDefault(), "%04d-%02d-%02d %02d:%02d:00", currentYear, month, day, hour, minute)
        }

        // 5. 사용처(가맹점) 추출
        var merchant = ""

        // 패턴 A: 날짜/시간 뒤에 오는 단어 (예: "10/13 11:55 주래등")
        val lineWithTime = lines.find { it.contains("/") && !it.contains("접수") }
        if (lineWithTime != null) {
            val parts = lineWithTime.split("\\s+".toRegex())
            val candidate = parts.lastOrNull {
                it.isNotBlank() && !it.contains("/") && !it.contains(":") && !it.contains("원") && !it.contains("누적")
            }
            if (!candidate.isNullOrBlank()) {
                merchant = candidate
            }
        }

        // 패턴 B: 자동결제 10/12접수 패턴의 다음 줄 (예: "LGU+ 통신(452325)")
        if (merchant.isBlank()) {
            for (i in 0 until lines.size) {
                val l = lines[i]
                if (l.contains("자동결제") || l.contains("접수") || l.contains("승인")) {
                    if (i + 1 < lines.size) {
                        val nextLine = lines[i + 1]
                        if (!nextLine.contains("원") && !nextLine.contains("누적") && !nextLine.contains("/")) {
                            merchant = nextLine
                            break
                        }
                    }
                }
            }
        }

        // 패턴 C: 일반 단어 추출
        if (merchant.isBlank()) {
            val words = rawBody.split("\\s+".toRegex())
            merchant = words.lastOrNull {
                it.isNotBlank() && !it.contains("원") && !it.contains("승인") && !it.contains("접수") && !it.contains("누적") && !it.contains("카드")
            } ?: "카드 결제"
        }

        // 가맹점 명칭 정제 (예: "LGU+ 통신(452325)" -> "LGU+ 통신")
        merchant = merchant.replace("\\([0-9]+\\)".toRegex(), "").trim()
        if (merchant.isBlank()) merchant = "카드 결제"

        return ParsedPaymentResult(
            isPayment = true,
            cardCompany = cardCompany,
            amount = amount,
            merchant = merchant,
            dateStr = dateStr,
            createdAtStr = createdAtStr,
            installmentType = installmentType,
            installmentMonths = installmentMonths
        )
    }
}
