package com.budgetapp.bridge

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

class FinancialParserModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    init {
        companionContext = reactContext
    }

    override fun getName(): String {
        return "FinancialParserModule"
    }

    companion object {
        private var companionContext: ReactApplicationContext? = null

        fun emitPaymentEvent(
            dateStr: String,
            amount: Int,
            merchant: String,
            paymentType: String,
            cardCompany: String? = null,
            installmentType: String,
            installmentMonths: Int,
            createdAtStr: String? = null
        ) {
            try {
                val ctx = companionContext ?: return
                if (!ctx.hasActiveReactInstance()) {
                    android.util.Log.w("FinancialParserModule", "React Native instance is not active. Skipping emit.")
                    return
                }

                val params: WritableMap = Arguments.createMap().apply {
                    putString("date", dateStr)
                    putInt("amount", amount)
                    putString("merchant", merchant)
                    putString("paymentType", paymentType)
                    if (cardCompany != null) {
                        putString("cardCompany", cardCompany)
                    }
                    putString("installmentType", installmentType)
                    putInt("installmentMonths", installmentMonths)
                    if (createdAtStr != null) {
                        putString("createdAt", createdAtStr)
                    }
                }

                ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    ?.emit("onPaymentParsed", params)
            } catch (e: Throwable) {
                android.util.Log.e("FinancialParserModule", "emitPaymentEvent error: ${e.message}", e)
            }
        }
    }
}
