package com.budgetapp

import android.os.Build
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  override fun getMainComponentName(): String = "BudgetApp"

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(null)
    if (Build.VERSION.SDK_INT >= 34) {
      try {
        val method = android.view.View::class.java.getMethod("setStylusHandwritingEnabled", Boolean::class.javaPrimitiveType)
        method.invoke(window.decorView, false)
      } catch (e: Throwable) {
        // Ignore
      }
    }
  }

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
