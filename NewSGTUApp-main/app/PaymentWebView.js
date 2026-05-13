import { useEffect, useState, useContext, useRef } from "react";
import { WebView } from "react-native-webview";
import {
  View,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Linking,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import ApiContext from "@/context/ApiContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { PAYMENT_REDIRECT_PATHS } from "../lib/serviceModules";

export default function PaymentWebView() {
  const { params } = useRoute();
  const { userId, name, email, source } = params || {};
  const { url, paymentHtml, setPaymentHtml } = useContext(ApiContext);
  const router = useRouter();

  const [htmlForm, setHtmlForm] = useState(null);
  const [loadError, setLoadError] = useState("");
  const outcomeResolvedRef = useRef(false);

  const sourceKey = Array.isArray(source) ? source[0] : source;

  const routeBySource = (query = "") => {
    if (!sourceKey) return false;

    if (sourceKey === "license-renewal") {
      router.replace(`/license-renewal${query}`);
      return true;
    }

    if (PAYMENT_REDIRECT_PATHS.includes(sourceKey)) {
      router.replace(`/(tabs)/services/${sourceKey}/status${query}`);
      return true;
    }

    return false;
  };

  const buildQuerySuffix = (nextUrl) => {
    try {
      const parsed = new URL(nextUrl);
      const query = parsed.search || "";
      return query || "";
    } catch {
      return "";
    }
  };

  const handleRedirect = (nextUrl) => {
    if (!nextUrl) return true;
    const query = buildQuerySuffix(nextUrl);

    const hasPaymentOutcome =
      nextUrl.includes("cancelled=true") ||
      nextUrl.includes("payment=success") ||
      nextUrl.includes("payment=failed") ||
      nextUrl.includes("reason=");

    if (hasPaymentOutcome && routeBySource(query)) {
      outcomeResolvedRef.current = true;
      return false;
    }

    if (nextUrl.includes("/authenticate/license-renewal")) {
      if (hasPaymentOutcome) {
        outcomeResolvedRef.current = true;
      }
      router.replace(`/license-renewal${query}`);
      return false;
    }

    const servicePath = PAYMENT_REDIRECT_PATHS.find((path) =>
      nextUrl.includes(`/authenticate/${path}/status`),
    );

    if (servicePath) {
      if (hasPaymentOutcome) {
        outcomeResolvedRef.current = true;
      }
      router.replace(`/(tabs)/services/${servicePath}/status${query}`);
      return false;
    }

    if (nextUrl.includes("/student-verification")) {
      if (hasPaymentOutcome) {
        outcomeResolvedRef.current = true;
      }
      router.replace(`/(tabs)/services/academic-records/status${query}`);
      return false;
    }

    if (nextUrl.includes("/authenticate/") && routeBySource(query)) {
      if (hasPaymentOutcome) {
        outcomeResolvedRef.current = true;
      }
      return false;
    }

    return true;
  };

  const handleNavigationStateChange = (navState) => {
    const currentUrl = navState?.url || "";

    if (
      currentUrl.includes("checkout.razorpay.com") ||
      currentUrl.includes("api.razorpay.com") ||
      currentUrl.includes("-response")
    ) {
      return;
    }
  };

  useEffect(() => {
    if (paymentHtml) {
      setHtmlForm(paymentHtml);
      setPaymentHtml(null);
      return;
    }

    if (htmlForm) {
      return;
    }

    if (!userId || !name || !email) {
      if (source) {
        setLoadError(
          "Payment session expired. Please go back and click Pay Now again.",
        );
      }
      return;
    }

    const fetchFormHTML = async () => {
      try {
        const res = await fetch(`${url}payment/create-order`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, name, email }),
        });

        const html = await res.text();
        setHtmlForm(html);
      } catch (error) {
        console.error(
          "Payment form fetch failed:",
          error?.message || "Unknown error",
        );
        setLoadError("Unable to start payment. Please try again.");
      }
    };

    fetchFormHTML();
  }, [email, htmlForm, name, paymentHtml, setPaymentHtml, source, url, userId]);

  if (!htmlForm) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" />
        {loadError ? (
          <Text className="mt-4 text-red-600 text-center px-6">
            {loadError}
          </Text>
        ) : null}
      </View>
    );
  }

  const openInBrowser = async () => {
    try {
      const response = await fetch(`${url}payment/form`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: htmlForm }),
      });

      if (!response.ok) {
        throw new Error("Failed to prepare payment form");
      }

      const payload = await response.json();
      if (!payload?.token) {
        throw new Error("Missing payment form token");
      }

      const formUrl = `${url}payment/form/${payload.token}`;
      await Linking.openURL(formUrl);
    } catch (error) {
      setLoadError("Unable to open external browser. Please try again.");
    }
  };

  return (
    <SafeAreaView className="flex-1">
      <View className="bg-white p-3 border-b border-gray-200">
        <Text className="text-gray-700 text-sm">
          If the payment page closes immediately, open it in your browser.
        </Text>
        <TouchableOpacity
          className="bg-indigo-700 rounded p-2 mt-2"
          onPress={openInBrowser}
        >
          <Text className="text-white text-center font-semibold">
            Open in External Browser
          </Text>
        </TouchableOpacity>
        {loadError ? (
          <>
            <Text className="text-amber-700 text-sm mt-2">{loadError}</Text>
            <TouchableOpacity
              className="bg-gray-700 rounded p-2 mt-2"
              onPress={() => {
                routeBySource("?reason=payment_check_pending");
              }}
            >
              <Text className="text-white text-center font-semibold">
                Check Payment Status
              </Text>
            </TouchableOpacity>
          </>
        ) : null}
      </View>

      <WebView
        originWhitelist={["*"]}
        source={{ html: htmlForm }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mixedContentMode="always"
        style={{ flex: 1 }}
        onShouldStartLoadWithRequest={(request) => handleRedirect(request?.url)}
        onNavigationStateChange={handleNavigationStateChange}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          const errorUrl = nativeEvent?.url || "";
          // If the error URL carries a payment outcome, honour it before showing fallback UI
          if (!outcomeResolvedRef.current && errorUrl) {
            const intercepted = handleRedirect(errorUrl);
            if (!intercepted) {
              // handleRedirect returned false = it already routed
              return;
            }
          }
          if (!outcomeResolvedRef.current) {
            setLoadError(
              "Payment page was interrupted. If payment is completed, use Check Payment Status.",
            );
          }
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          const errorUrl = nativeEvent?.url || "";
          if (!outcomeResolvedRef.current && errorUrl) {
            const intercepted = handleRedirect(errorUrl);
            if (!intercepted) {
              return;
            }
          }
          if (!outcomeResolvedRef.current) {
            setLoadError(
              "Payment network response failed. If amount was debited, use Check Payment Status.",
            );
          }
        }}
      />
    </SafeAreaView>
  );
}
