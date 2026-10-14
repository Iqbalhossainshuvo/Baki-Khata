package expo.modules.googleauth

import android.accounts.Account
import com.google.android.gms.auth.GoogleAuthUtil
import com.google.android.gms.auth.api.identity.AuthorizationRequest
import com.google.android.gms.auth.api.identity.Identity
import com.google.android.gms.common.api.ApiException
import com.google.android.gms.common.api.CommonStatusCodes
import com.google.android.gms.common.api.Scope
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Google Identity Services AuthorizationClient — the replacement for the
// deprecated GoogleSignInClient. It shows the account picker / consent screen
// when needed and returns an OAuth access token for the requested scopes.
class GoogleAuthModule : Module() {
  private var pending: Promise? = null

  override fun definition() = ModuleDefinition {
    Name("GoogleAuth")

    // Resolves with an access token, or null when user interaction is needed
    // but `interactive` is false.
    AsyncFunction("authorize") { scopes: List<String>, account: String?, interactive: Boolean, promise: Promise ->
      val activity = appContext.currentActivity
      if (activity == null) {
        promise.reject("NO_ACTIVITY", "App is not in the foreground", null)
        return@AsyncFunction
      }
      val builder = AuthorizationRequest.builder().setRequestedScopes(scopes.map { Scope(it) })
      if (!account.isNullOrEmpty()) builder.setAccount(Account(account, "com.google"))

      Identity.getAuthorizationClient(activity).authorize(builder.build())
        .addOnSuccessListener { result ->
          val intent = result.pendingIntent
          if (result.hasResolution() && intent != null) {
            if (!interactive) {
              promise.resolve(null)
              return@addOnSuccessListener
            }
            pending?.reject("SUPERSEDED", "A newer sign-in request replaced this one", null)
            pending = promise
            try {
              activity.startIntentSenderForResult(intent.intentSender, REQUEST_CODE, null, 0, 0, 0, null)
            } catch (e: Exception) {
              pending = null
              promise.reject("LAUNCH_FAILED", e.message, e)
            }
          } else {
            promise.resolve(result.accessToken)
          }
        }
        .addOnFailureListener { e -> promise.reject(codeOf(e), e.message, e) }
    }

    AsyncFunction("clearToken") { token: String ->
      GoogleAuthUtil.clearToken(appContext.reactContext!!, token)
    }

    OnActivityResult { activity, payload ->
      if (payload.requestCode != REQUEST_CODE) return@OnActivityResult
      val promise = pending ?: return@OnActivityResult
      pending = null
      try {
        val result = Identity.getAuthorizationClient(activity).getAuthorizationResultFromIntent(payload.data)
        promise.resolve(result.accessToken)
      } catch (e: ApiException) {
        if (e.statusCode == CommonStatusCodes.CANCELED || payload.resultCode == android.app.Activity.RESULT_CANCELED) {
          promise.reject("CANCELLED", "Sign-in was cancelled", e)
        } else {
          promise.reject(codeOf(e), e.message, e)
        }
      }
    }
  }

  private fun codeOf(e: Exception) =
    if (e is ApiException) "GOOGLE_${e.statusCode}" else "AUTH_FAILED"

  companion object {
    private const val REQUEST_CODE = 0x6b61 // "ka"
  }
}
