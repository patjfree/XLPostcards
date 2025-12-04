Running 'gradlew :app:bundleRelease' in /home/expo/workingdir/build/android
Welcome to Gradle 8.13!
Here are the highlights of this release:
- Daemon JVM auto-provisioning
 - Enhancements for Scala plugin and JUnit testing
 - Improvements for build authors and plugin developers
For more details see https://docs.gradle.org/8.13/release-notes.html
To honour the JVM settings for this build a single-use Daemon process will be forked. For more on this, please refer to https://docs.gradle.org/8.13/userguide/gradle_daemon.html#sec:disabling_the_daemon in the Gradle documentation.
Daemon will be stopped at the end of the build
> Configure project :expo-gradle-plugin:expo-autolinking-plugin-shared
w: file:///home/expo/workingdir/build/node_modules/expo-modules-autolinking/android/expo-gradle-plugin/expo-autolinking-plugin-shared/build.gradle.kts:32:9: The expression is unused
> Task :gradle-plugin:shared:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :gradle-plugin:settings-plugin:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :expo-gradle-plugin:expo-autolinking-plugin-shared:checkKotlinGradlePluginConfigurationErrors
> Task :expo-gradle-plugin:expo-autolinking-settings-plugin:checkKotlinGradlePluginConfigurationErrors
> Task :expo-gradle-plugin:expo-autolinking-settings-plugin:pluginDescriptors
> Task :gradle-plugin:settings-plugin:pluginDescriptors
> Task :gradle-plugin:settings-plugin:processResources
> Task :expo-gradle-plugin:expo-autolinking-settings-plugin:processResources
> Task :expo-gradle-plugin:expo-autolinking-plugin-shared:processResources NO-SOURCE
> Task :gradle-plugin:shared:processResources NO-SOURCE
> Task :gradle-plugin:shared:compileKotlin
> Task :gradle-plugin:shared:compileJava NO-SOURCE
> Task :gradle-plugin:shared:classes UP-TO-DATE
> Task :gradle-plugin:shared:jar
> Task :expo-gradle-plugin:expo-autolinking-plugin-shared:compileKotlin
> Task :expo-gradle-plugin:expo-autolinking-plugin-shared:compileJava NO-SOURCE
> Task :expo-gradle-plugin:expo-autolinking-plugin-shared:classes UP-TO-DATE
> Task :expo-gradle-plugin:expo-autolinking-plugin-shared:jar
> Task :gradle-plugin:settings-plugin:compileKotlin
> Task :gradle-plugin:settings-plugin:compileJava NO-SOURCE
> Task :gradle-plugin:settings-plugin:classes
> Task :gradle-plugin:settings-plugin:jar
> Task :expo-gradle-plugin:expo-autolinking-settings-plugin:compileKotlin
> Task :expo-gradle-plugin:expo-autolinking-settings-plugin:compileJava NO-SOURCE
> Task :expo-gradle-plugin:expo-autolinking-settings-plugin:classes
> Task :expo-gradle-plugin:expo-autolinking-settings-plugin:jar
> Configure project :expo-updates-gradle-plugin
w: file:///home/expo/workingdir/build/node_modules/expo-updates/expo-updates-gradle-plugin/build.gradle.kts:25:3: 'kotlinOptions(KotlinJvmOptionsDeprecated /* = KotlinJvmOptions */.() -> Unit): Unit' is deprecated. Please migrate to the compilerOptions DSL. More details are here: https://kotl.in/u1r8ln
> Task :expo-gradle-plugin:expo-autolinking-plugin:checkKotlinGradlePluginConfigurationErrors
> Task :expo-dev-launcher-gradle-plugin:checkKotlinGradlePluginConfigurationErrors
> Task :expo-updates-gradle-plugin:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :expo-module-gradle-plugin:checkKotlinGradlePluginConfigurationErrors
> Task :expo-dev-launcher-gradle-plugin:pluginDescriptors
> Task :expo-updates-gradle-plugin:pluginDescriptors
> Task :expo-module-gradle-plugin:pluginDescriptors
> Task :expo-dev-launcher-gradle-plugin:processResources
> Task :gradle-plugin:react-native-gradle-plugin:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :expo-module-gradle-plugin:processResources
> Task :expo-updates-gradle-plugin:processResources
> Task :expo-gradle-plugin:expo-autolinking-plugin:pluginDescriptors
> Task :expo-gradle-plugin:expo-autolinking-plugin:processResources
> Task :gradle-plugin:react-native-gradle-plugin:pluginDescriptors
> Task :gradle-plugin:react-native-gradle-plugin:processResources
> Task :expo-gradle-plugin:expo-autolinking-plugin:compileKotlin
w: file:///home/expo/workingdir/build/node_modules/expo-modules-autolinking/android/expo-gradle-plugin/expo-autolinking-plugin/src/main/kotlin/expo/modules/plugin/ExpoAutolinkingPlugin.kt:29:71 Name shadowed: project
> Task :expo-gradle-plugin:expo-autolinking-plugin:compileJava NO-SOURCE
> Task :expo-gradle-plugin:expo-autolinking-plugin:classes
> Task :expo-gradle-plugin:expo-autolinking-plugin:jar
> Task :gradle-plugin:react-native-gradle-plugin:compileKotlin
> Task :gradle-plugin:react-native-gradle-plugin:compileJava NO-SOURCE
> Task :gradle-plugin:react-native-gradle-plugin:classes
> Task :gradle-plugin:react-native-gradle-plugin:jar
> Task :expo-dev-launcher-gradle-plugin:compileKotlin
> Task :expo-dev-launcher-gradle-plugin:compileJava NO-SOURCE
> Task :expo-dev-launcher-gradle-plugin:classes
> Task :expo-dev-launcher-gradle-plugin:jar
> Task :expo-module-gradle-plugin:compileKotlin
w: file:///home/expo/workingdir/build/node_modules/expo-modules-core/expo-module-gradle-plugin/src/main/kotlin/expo/modules/plugin/android/AndroidLibraryExtension.kt:9:24 'targetSdk: Int?' is deprecated. Will be removed from library DSL in v9.0. Use testOptions.targetSdk or/and lint.targetSdk instead
> Task :expo-module-gradle-plugin:compileJava NO-SOURCE
> Task :expo-module-gradle-plugin:classes
> Task :expo-module-gradle-plugin:jar
> Task :expo-updates-gradle-plugin:compileKotlin
> Task :expo-updates-gradle-plugin:compileJava NO-SOURCE
> Task :expo-updates-gradle-plugin:classes
> Task :expo-updates-gradle-plugin:jar
> Configure project :
[32m[ExpoRootProject][0m Using the following versions:
  - buildTools:  [32m35.0.0[0m
  - minSdk:      [32m24[0m
  - compileSdk:  [32m35[0m
  - targetSdk:   [32m35[0m
  - ndk:         [32m27.1.12297006[0m
  - kotlin:      [32m2.0.21[0m
  - ksp:         [32m2.0.21-1.0.28[0m
> Configure project :app
 ℹ️  [33mApplying gradle plugin[0m '[32mexpo-dev-launcher-gradle-plugin[0m'
 ℹ️  [33mApplying gradle plugin[0m '[32mexpo-updates-gradle-plugin[0m'
Checking the license for package NDK (Side by side) 27.1.12297006 in /home/expo/Android/Sdk/licenses
License for package NDK (Side by side) 27.1.12297006 accepted.
Preparing "Install NDK (Side by side) 27.1.12297006 v.27.1.12297006".
"Install NDK (Side by side) 27.1.12297006 v.27.1.12297006" ready.
Installing NDK (Side by side) 27.1.12297006 in /home/expo/Android/Sdk/ndk/27.1.12297006
"Install NDK (Side by side) 27.1.12297006 v.27.1.12297006" complete.
"Install NDK (Side by side) 27.1.12297006 v.27.1.12297006" finished.
> Configure project :expo
Using expo modules
  - [32mexpo-constants[0m (17.1.7)
  - [32mexpo-dev-client[0m (5.2.4)
  - [32mexpo-dev-launcher[0m (5.1.16)
  - [32mexpo-dev-menu[0m (6.1.14)
  - [32mexpo-dev-menu-interface[0m (1.10.0)
- [32mexpo-eas-client[0m (0.14.4)
  - [32mexpo-image-loader[0m (5.1.0)
  - [32mexpo-image-manipulator[0m (13.1.7)
  - [32mexpo-json-utils[0m (0.15.0)
  - [32mexpo-manifests[0m (0.16.6)
- [32mexpo-modules-core[0m (2.5.0)
- [32mexpo-structured-headers[0m (4.1.0)
- [32mexpo-updates[0m (0.28.17)
- [32mexpo-updates-interface[0m (1.1.0)
  - [33m[📦][0m [32mexpo-asset[0m (11.1.7)
  - [33m[📦][0m [32mexpo-blur[0m (14.1.5)
  - [33m[📦][0m [32mexpo-contacts[0m (14.2.5)
  - [33m[📦][0m [32mexpo-file-system[0m (18.1.11)
  - [33m[📦][0m [32mexpo-font[0m (13.3.2)
  - [33m[📦][0m [32mexpo-haptics[0m (14.1.4)
  - [33m[📦][0m [32mexpo-image-picker[0m (16.1.4)
  - [33m[📦][0m [32mexpo-keep-awake[0m (14.1.4)
  - [33m[📦][0m [32mexpo-linking[0m (7.1.7)
  - [33m[📦][0m [32mexpo-location[0m (18.1.6)
  - [33m[📦][0m [32mexpo-media-library[0m (17.1.7)
  - [33m[📦][0m [32mexpo-splash-screen[0m (0.30.10)
  - [33m[📦][0m [32mexpo-system-ui[0m (5.0.11)
  - [33m[📦][0m [32mexpo-web-browser[0m (14.2.0)
> Configure project :react-native-reanimated
Android gradle plugin: 8.8.2
Gradle: 8.13
> Task :expo-dev-client:preBuild UP-TO-DATE
> Task :expo-dev-client:preReleaseBuild UP-TO-DATE
> Task :expo-dev-client:generateReleaseResValues
> Task :expo-dev-client:generateReleaseResources
> Task :expo-dev-client:packageReleaseResources
> Task :expo-dev-launcher:preBuild UP-TO-DATE
> Task :expo-dev-launcher:preReleaseBuild UP-TO-DATE
> Task :expo-dev-launcher:generateReleaseResValues
> Task :expo-dev-launcher:generateReleaseResources
> Task :expo-constants:createExpoConfig
> Task :expo-constants:preBuild
> Task :expo-constants:preReleaseBuild
> Task :expo-constants:generateReleaseResValues
> Task :expo-constants:generateReleaseResources
> Task :expo-constants:packageReleaseResources
> Task :expo-dev-menu:clenupAssets UP-TO-DATE
The NODE_ENV environment variable is required but was not specified. Ensure the project is bundled with Expo CLI or NODE_ENV is set. Using only .env.local and .env
> Task :expo-dev-menu:copyAssets
> Task :expo-dev-menu:preBuild
> Task :expo-dev-menu:preReleaseBuild
> Task :expo-dev-menu:generateReleaseResValues
> Task :expo:generatePackagesList
> Task :expo:preBuild
> Task :expo:preReleaseBuild
> Task :expo-dev-menu:generateReleaseResources
> Task :expo:generateReleaseResValues
> Task :expo:generateReleaseResources
> Task :expo:packageReleaseResources
> Task :expo-dev-menu-interface:preBuild UP-TO-DATE
> Task :expo-dev-menu-interface:preReleaseBuild UP-TO-DATE
> Task :expo-dev-menu-interface:generateReleaseResValues
> Task :expo-dev-menu-interface:generateReleaseResources
> Task :expo-dev-menu-interface:packageReleaseResources
> Task :expo-eas-client:preBuild UP-TO-DATE
> Task :expo-eas-client:preReleaseBuild UP-TO-DATE
> Task :expo-dev-launcher:packageReleaseResources
> Task :expo-image-loader:preBuild UP-TO-DATE
> Task :expo-image-loader:preReleaseBuild UP-TO-DATE
> Task :expo-eas-client:generateReleaseResValues
> Task :expo-image-loader:generateReleaseResValues
> Task :expo-eas-client:generateReleaseResources
> Task :expo-image-loader:generateReleaseResources
> Task :expo-eas-client:packageReleaseResources
> Task :expo-image-manipulator:preBuild
UP-TO-DATE
> Task :expo-image-manipulator:preReleaseBuild UP-TO-DATE
> Task :expo-image-loader:packageReleaseResources
> Task :expo-json-utils:preBuild UP-TO-DATE
> Task :expo-json-utils:preReleaseBuild UP-TO-DATE
> Task :expo-image-manipulator:generateReleaseResValues
> Task :expo-json-utils:generateReleaseResValues
> Task :expo-image-manipulator:generateReleaseResources
> Task :expo-json-utils:generateReleaseResources
> Task :expo-json-utils:packageReleaseResources
> Task :expo-manifests:preBuild UP-TO-DATE
> Task :expo-manifests:preReleaseBuild UP-TO-DATE
> Task :expo-manifests:generateReleaseResValues
> Task :expo-manifests:generateReleaseResources
> Task :expo-dev-menu:packageReleaseResources
> Task :expo-modules-core:preBuild UP-TO-DATE
> Task :expo-modules-core:preReleaseBuild UP-TO-DATE
> Task :expo-manifests:packageReleaseResources
> Task :expo-modules-core:generateReleaseResValues
> Task :expo-image-manipulator:packageReleaseResources
> Task :expo-structured-headers:preBuild UP-TO-DATE
> Task :expo-structured-headers:preReleaseBuild UP-TO-DATE
> Task :expo-updates:preBuild UP-TO-DATE
> Task :expo-updates:preReleaseBuild UP-TO-DATE
> Task :expo-structured-headers:generateReleaseResValues
> Task :expo-updates:generateReleaseResValues
> Task :expo-structured-headers:generateReleaseResources
> Task :expo-updates:generateReleaseResources
> Task :expo-modules-core:generateReleaseResources
> Task :expo-structured-headers:packageReleaseResources
> Task :expo-updates-interface:preBuild UP-TO-DATE
> Task :expo-modules-core:packageReleaseResources
> Task :expo-updates-interface:preReleaseBuild UP-TO-DATE
> Task :expo-updates-interface:generateReleaseResValues
> Task :expo-updates:packageReleaseResources
> Task :expo-updates-interface:generateReleaseResources
> Task :expo-updates-interface:packageReleaseResources
> Task :react-native-get-random-values:preBuild UP-TO-DATE
> Task :react-native-get-random-values:preReleaseBuild UP-TO-DATE
> Task :react-native-get-random-values:generateReleaseResValues
> Task :react-native-get-random-values:generateReleaseResources
> Task :react-native-get-random-values:packageReleaseResources
> Task :react-native-async-storage_async-storage:generateCodegenSchemaFromJavaScript
> Task :react-native-gesture-handler:generateCodegenSchemaFromJavaScript
> Task :react-native-image-crop-picker:generateCodegenSchemaFromJavaScript
> Task :react-native-async-storage_async-storage:generateCodegenArtifactsFromSchema
> Task :react-native-async-storage_async-storage:preBuild
> Task :react-native-async-storage_async-storage:preReleaseBuild
> Task :react-native-async-storage_async-storage:generateReleaseResValues
> Task :react-native-async-storage_async-storage:generateReleaseResources
> Task :react-native-gesture-handler:generateCodegenArtifactsFromSchema
> Task :react-native-gesture-handler:preBuild
> Task :react-native-gesture-handler:preReleaseBuild
> Task :react-native-image-crop-picker:generateCodegenArtifactsFromSchema
> Task :react-native-gesture-handler:generateReleaseResValues
> Task :react-native-image-crop-picker:preBuild
> Task :react-native-image-crop-picker:preReleaseBuild
> Task :react-native-gesture-handler:generateReleaseResources
> Task :react-native-image-crop-picker:generateReleaseResValues
> Task :react-native-async-storage_async-storage:packageReleaseResources
> Task :react-native-image-crop-picker:generateReleaseResources
> Task :react-native-image-crop-picker:packageReleaseResources
> Task :react-native-reanimated:assertMinimalReactNativeVersionTask SKIPPED
> Task :react-native-gesture-handler:packageReleaseResources
> Task :react-native-safe-area-context:generateCodegenSchemaFromJavaScript
> Task :react-native-reanimated:generateCodegenSchemaFromJavaScript
> Task :react-native-picker_picker:generateCodegenSchemaFromJavaScript
> Task :react-native-reanimated:generateCodegenArtifactsFromSchema
> Task :react-native-safe-area-context:generateCodegenArtifactsFromSchema
> Task :react-native-safe-area-context:preBuild
> Task :react-native-safe-area-context:preReleaseBuild
> Task :react-native-safe-area-context:generateReleaseResValues
> Task :react-native-safe-area-context:generateReleaseResources
> Task :react-native-reanimated:prepareReanimatedHeadersForPrefabs
> Task :react-native-safe-area-context:packageReleaseResources
> Task :react-native-reanimated:prepareWorkletsHeadersForPrefabs
> Task :react-native-reanimated:preBuild
> Task :react-native-reanimated:preReleaseBuild
> Task :react-native-reanimated:generateReleaseResValues
> Task :react-native-reanimated:generateReleaseResources
> Task :react-native-picker_picker:generateCodegenArtifactsFromSchema
> Task :react-native-picker_picker:preBuild
> Task :react-native-picker_picker:preReleaseBuild
> Task :react-native-reanimated:packageReleaseResources
> Task :react-native-picker_picker:generateReleaseResValues
> Task :react-native-picker_picker:generateReleaseResources
> Task :react-native-picker_picker:packageReleaseResources
> Task :react-native-view-shot:generateCodegenSchemaFromJavaScript
> Task :react-native-screens:generateCodegenSchemaFromJavaScript
> Task :react-native-svg:generateCodegenSchemaFromJavaScript
> Task :react-native-view-shot:generateCodegenArtifactsFromSchema
> Task :react-native-view-shot:preBuild
> Task :react-native-view-shot:preReleaseBuild
> Task :react-native-view-shot:generateReleaseResValues
> Task :react-native-view-shot:generateReleaseResources
> Task :react-native-view-shot:packageReleaseResources
> Task :react-native-screens:generateCodegenArtifactsFromSchema
> Task :react-native-screens:preBuild
> Task :react-native-screens:preReleaseBuild
> Task :react-native-screens:generateReleaseResValues
> Task :react-native-screens:generateReleaseResources
> Task :app:createBundleReleaseJsAndAssets
Starting Metro Bundler
> Task :react-native-screens:packageReleaseResources
> Task :react-native-svg:generateCodegenArtifactsFromSchema
> Task :react-native-svg:preBuild
> Task :react-native-svg:preReleaseBuild
> Task :react-native-svg:generateReleaseResValues
> Task :react-native-svg:generateReleaseResources
> Task :react-native-svg:packageReleaseResources
> Task :expo:extractDeepLinksRelease
> Task :react-native-webview:generateCodegenSchemaFromJavaScript
> Task :expo:processReleaseManifest
> Task :expo-constants:extractDeepLinksRelease
> Task :stripe_stripe-react-native:generateCodegenSchemaFromJavaScript
> Task :expo-constants:processReleaseManifest
> Task :expo-dev-client:extractDeepLinksRelease
> Task :expo-dev-client:processReleaseManifest
> Task :expo-dev-launcher:extractDeepLinksRelease
> Task :expo-dev-launcher:processReleaseManifest
> Task :expo-dev-menu:extractDeepLinksRelease
> Task :expo-dev-menu:processReleaseManifest
> Task :expo-dev-menu-interface:extractDeepLinksRelease
> Task :expo-dev-menu-interface:processReleaseManifest
> Task :expo-eas-client:extractDeepLinksRelease
> Task :expo-eas-client:processReleaseManifest
> Task :expo-image-loader:extractDeepLinksRelease
> Task :expo-image-loader:processReleaseManifest
> Task :expo-image-manipulator:extractDeepLinksRelease
> Task :expo-image-manipulator:processReleaseManifest
> Task :expo-json-utils:extractDeepLinksRelease
> Task :expo-json-utils:processReleaseManifest
> Task :expo-manifests:extractDeepLinksRelease
> Task :react-native-webview:generateCodegenArtifactsFromSchema
> Task :react-native-webview:preBuild
> Task :react-native-webview:preReleaseBuild
> Task :react-native-webview:generateReleaseResValues
> Task :react-native-webview:generateReleaseResources
> Task :expo-manifests:processReleaseManifest
> Task :expo-modules-core:extractDeepLinksRelease
> Task :react-native-webview:packageReleaseResources
> Task :expo-structured-headers:extractDeepLinksRelease
> Task :stripe_stripe-react-native:generateCodegenArtifactsFromSchema
> Task :stripe_stripe-react-native:preBuild
> Task :stripe_stripe-react-native:preReleaseBuild
> Task :stripe_stripe-react-native:generateReleaseResValues
> Task :stripe_stripe-react-native:generateReleaseResources
> Task :expo-structured-headers:processReleaseManifest
> Task :expo-modules-core:processReleaseManifest
/home/expo/workingdir/build/node_modules/expo-modules-core/android/src/main/AndroidManifest.xml:8:9-11:45 Warning:
	meta-data#com.facebook.soloader.enabled@android:value was tagged at AndroidManifest.xml:8 to replace other declarations but no other declaration present
> Task :expo-updates:extractDeepLinksRelease
> Task :expo-updates-interface:extractDeepLinksRelease
> Task :stripe_stripe-react-native:packageReleaseResources
> Task :react-native-async-storage_async-storage:extractDeepLinksRelease
> Task :expo-updates:processReleaseManifest
> Task :react-native-gesture-handler:extractDeepLinksRelease
> Task :react-native-async-storage_async-storage:processReleaseManifest
package="com.reactnativecommunity.asyncstorage" found in source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/@react-native-async-storage/async-storage/android/src/main/AndroidManifest.xml.
Setting the namespace via the package attribute in the source AndroidManifest.xml is no longer supported, and the value is ignored.
Recommendation: remove package="com.reactnativecommunity.asyncstorage" from the source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/@react-native-async-storage/async-storage/android/src/main/AndroidManifest.xml.
> Task :expo-updates-interface:processReleaseManifest
> Task :react-native-get-random-values:extractDeepLinksRelease
> Task :react-native-image-crop-picker:extractDeepLinksRelease
> Task :react-native-gesture-handler:processReleaseManifest
> Task :react-native-get-random-values:processReleaseManifest
package="org.linusu" found in source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/react-native-get-random-values/android/src/main/AndroidManifest.xml.
Setting the namespace via the package attribute in the source AndroidManifest.xml is no longer supported, and the value is ignored.
Recommendation: remove package="org.linusu" from the source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/react-native-get-random-values/android/src/main/AndroidManifest.xml.
> Task :react-native-picker_picker:extractDeepLinksRelease
> Task :react-native-reanimated:extractDeepLinksRelease
> Task :react-native-image-crop-picker:processReleaseManifest
package="com.reactnative.ivpusic.imagepicker" found in source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/react-native-image-crop-picker/android/src/main/AndroidManifest.xml.
Setting the namespace via the package attribute in the source AndroidManifest.xml is no longer supported, and the value is ignored.
Recommendation: remove package="com.reactnative.ivpusic.imagepicker" from the source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/react-native-image-crop-picker/android/src/main/AndroidManifest.xml.
> Task :react-native-safe-area-context:extractDeepLinksRelease
> Task :react-native-picker_picker:processReleaseManifest
package="com.reactnativecommunity.picker" found in source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/@react-native-picker/picker/android/src/main/AndroidManifest.xml.
Setting the namespace via the package attribute in the source AndroidManifest.xml is no longer supported, and the value is ignored.
Recommendation: remove package="com.reactnativecommunity.picker" from the source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/@react-native-picker/picker/android/src/main/AndroidManifest.xml.
> Task :react-native-reanimated:processReleaseManifest
> Task :react-native-svg:extractDeepLinksRelease
> Task :react-native-screens:extractDeepLinksRelease
> Task :react-native-screens:processReleaseManifest
> Task :react-native-safe-area-context:processReleaseManifest
package="com.th3rdwave.safeareacontext" found in source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/react-native-safe-area-context/android/src/main/AndroidManifest.xml.
Setting the namespace via the package attribute in the source AndroidManifest.xml is no longer supported, and the value is ignored.
Recommendation: remove package="com.th3rdwave.safeareacontext" from the source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/react-native-safe-area-context/android/src/main/AndroidManifest.xml.
> Task :react-native-svg:processReleaseManifest
> Task :react-native-view-shot:extractDeepLinksRelease
> Task :react-native-webview:extractDeepLinksRelease
> Task :stripe_stripe-react-native:extractDeepLinksRelease
> Task :react-native-webview:processReleaseManifest
> Task :stripe_stripe-react-native:processReleaseManifest
package="com.reactnativestripesdk" found in source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/AndroidManifest.xml.
Setting the namespace via the package attribute in the source AndroidManifest.xml is no longer supported, and the value is ignored.
Recommendation: remove package="com.reactnativestripesdk" from the source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/AndroidManifest.xml.
> Task :react-native-view-shot:processReleaseManifest
package="fr.greweb.reactnativeviewshot" found in source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/react-native-view-shot/android/src/main/AndroidManifest.xml.
Setting the namespace via the package attribute in the source AndroidManifest.xml is no longer supported, and the value is ignored.
Recommendation: remove package="fr.greweb.reactnativeviewshot" from the source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/react-native-view-shot/android/src/main/AndroidManifest.xml.
> Task :expo-dev-client:writeReleaseAarMetadata
> Task :expo-constants:writeReleaseAarMetadata
> Task :expo-dev-launcher:writeReleaseAarMetadata
> Task :expo:writeReleaseAarMetadata
> Task :expo-eas-client:writeReleaseAarMetadata
> Task :expo-dev-menu-interface:writeReleaseAarMetadata
> Task :expo-dev-menu:writeReleaseAarMetadata
> Task :expo-image-manipulator:writeReleaseAarMetadata
> Task :expo-manifests:writeReleaseAarMetadata
> Task :expo-json-utils:writeReleaseAarMetadata
> Task :expo-image-loader:writeReleaseAarMetadata
> Task :expo-structured-headers:writeReleaseAarMetadata
> Task :expo-modules-core:writeReleaseAarMetadata
> Task :expo-updates:writeReleaseAarMetadata
> Task :expo-updates-interface:writeReleaseAarMetadata
> Task :react-native-gesture-handler:writeReleaseAarMetadata
> Task :react-native-async-storage_async-storage:writeReleaseAarMetadata
> Task :react-native-image-crop-picker:writeReleaseAarMetadata
> Task :react-native-picker_picker:writeReleaseAarMetadata
> Task :react-native-get-random-values:writeReleaseAarMetadata
> Task :react-native-reanimated:writeReleaseAarMetadata
> Task :react-native-safe-area-context:writeReleaseAarMetadata
> Task :react-native-screens:writeReleaseAarMetadata
> Task :react-native-svg:writeReleaseAarMetadata
> Task :react-native-webview:writeReleaseAarMetadata
> Task :react-native-view-shot:writeReleaseAarMetadata
> Task :stripe_stripe-react-native:writeReleaseAarMetadata
> Task :expo-constants:compileReleaseLibraryResources
> Task :expo-dev-client:compileReleaseLibraryResources
> Task :expo:compileReleaseLibraryResources
> Task :expo:parseReleaseLocalResources
> Task :expo-dev-client:parseReleaseLocalResources
> Task :expo-constants:parseReleaseLocalResources
> Task :expo-constants:generateReleaseRFile
> Task :expo:generateReleaseRFile
> Task :expo-dev-client:generateReleaseRFile
> Task :expo-dev-menu-interface:compileReleaseLibraryResources
> Task :expo-dev-launcher:parseReleaseLocalResources
> Task :expo-dev-launcher:compileReleaseLibraryResources
> Task :expo-dev-launcher:generateReleaseRFile
> Task :expo-dev-menu:parseReleaseLocalResources
> Task :expo-dev-menu-interface:parseReleaseLocalResources
> Task :expo-dev-menu:compileReleaseLibraryResources
> Task :expo-dev-menu:generateReleaseRFile
> Task :expo-dev-menu-interface:generateReleaseRFile
> Task :expo-eas-client:compileReleaseLibraryResources
> Task :expo-image-loader:compileReleaseLibraryResources
> Task :expo-image-manipulator:compileReleaseLibraryResources
> Task :expo-eas-client:parseReleaseLocalResources
> Task :expo-image-loader:parseReleaseLocalResources
> Task :expo-image-manipulator:parseReleaseLocalResources
> Task :expo-eas-client:generateReleaseRFile
> Task :expo-image-loader:generateReleaseRFile
> Task :expo-image-manipulator:generateReleaseRFile
> Task :expo-modules-core:compileReleaseLibraryResources
> Task :expo-manifests:compileReleaseLibraryResources
> Task :expo-json-utils:compileReleaseLibraryResources
> Task :expo-manifests:parseReleaseLocalResources
> Task :expo-json-utils:parseReleaseLocalResources
> Task :expo-modules-core:parseReleaseLocalResources
> Task :expo-json-utils:generateReleaseRFile
> Task :expo-manifests:generateReleaseRFile
> Task :expo-modules-core:generateReleaseRFile
> Task :expo-updates:compileReleaseLibraryResources
> Task :expo-structured-headers:compileReleaseLibraryResources
> Task :expo-updates-interface:compileReleaseLibraryResources
> Task :expo-structured-headers:parseReleaseLocalResources
> Task :expo-updates-interface:parseReleaseLocalResources
> Task :expo-updates-interface:generateReleaseRFile
> Task :expo-updates:parseReleaseLocalResources
> Task :expo-structured-headers:generateReleaseRFile
> Task :react-native-async-storage_async-storage:compileReleaseLibraryResources
> Task :react-native-gesture-handler:compileReleaseLibraryResources
> Task :expo-updates:generateReleaseRFile
> Task :react-native-async-storage_async-storage:parseReleaseLocalResources
> Task :react-native-get-random-values:compileReleaseLibraryResources
> Task :react-native-gesture-handler:parseReleaseLocalResources
> Task :react-native-get-random-values:parseReleaseLocalResources
> Task :react-native-async-storage_async-storage:generateReleaseRFile
> Task :react-native-gesture-handler:generateReleaseRFile
> Task :react-native-image-crop-picker:compileReleaseLibraryResources
> Task :react-native-get-random-values:generateReleaseRFile
> Task :react-native-picker_picker:compileReleaseLibraryResources
> Task :react-native-image-crop-picker:parseReleaseLocalResources
> Task :react-native-picker_picker:parseReleaseLocalResources
> Task :react-native-reanimated:compileReleaseLibraryResources
> Task :react-native-image-crop-picker:generateReleaseRFile
> Task :react-native-picker_picker:generateReleaseRFile
> Task :react-native-reanimated:parseReleaseLocalResources
> Task :react-native-safe-area-context:compileReleaseLibraryResources
> Task :react-native-reanimated:generateReleaseRFile
> Task :react-native-safe-area-context:parseReleaseLocalResources
> Task :react-native-screens:compileReleaseLibraryResources
> Task :react-native-svg:compileReleaseLibraryResources
> Task :react-native-svg:parseReleaseLocalResources
> Task :react-native-screens:parseReleaseLocalResources
> Task :react-native-safe-area-context:generateReleaseRFile
> Task :react-native-svg:generateReleaseRFile
> Task :react-native-view-shot:compileReleaseLibraryResources
> Task :react-native-webview:compileReleaseLibraryResources
> Task :react-native-view-shot:parseReleaseLocalResources
> Task :react-native-screens:generateReleaseRFile
> Task :stripe_stripe-react-native:compileReleaseLibraryResources
> Task :react-native-webview:parseReleaseLocalResources
> Task :react-native-view-shot:generateReleaseRFile
> Task :react-native-gesture-handler:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :stripe_stripe-react-native:parseReleaseLocalResources
> Task :react-native-webview:generateReleaseRFile
> Task :stripe_stripe-react-native:generateReleaseRFile
> Task :stripe_stripe-react-native:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :react-native-gesture-handler:generateReleaseBuildConfig
> Task :react-native-reanimated:generateReleaseBuildConfig
> Task :react-native-gesture-handler:javaPreCompileRelease
> Task :react-native-reanimated:packageNdkLibs NO-SOURCE
> Task :react-native-safe-area-context:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :react-native-safe-area-context:generateReleaseBuildConfig
> Task :app:createBundleReleaseJsAndAssets
Android node_modules/expo-router/entry.js ▓▓▓▓▓▓▓▓▓▓▓▓░░░░ 79.7% ( 950/1064)
Android Bundled 2618ms node_modules/expo-router/entry.js (1532 modules)
Writing bundle output to: /home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle
Writing sourcemap output to: /home/expo/workingdir/build/android/app/build/intermediates/sourcemaps/react/release/index.android.bundle.packager.map
Copying 51 asset files
Done writing bundle output
Done writing sourcemap output
> Task :react-native-reanimated:javaPreCompileRelease
> Task :react-native-reanimated:compileReleaseJavaWithJavac
Note: Some input files use or override a deprecated API.
Note: Recompile with -Xlint:deprecation for details.
Note: Some input files use unchecked or unsafe operations.
Note: Recompile with -Xlint:unchecked for details.
> Task :app:generateAutolinkingNewArchitectureFiles
> Task :app:generateAutolinkingPackageList
> Task :app:generateCodegenSchemaFromJavaScript SKIPPED
> Task :react-native-safe-area-context:compileReleaseKotlin
w: file:///home/expo/workingdir/build/node_modules/react-native-safe-area-context/android/src/main/java/com/th3rdwave/safeareacontext/SafeAreaView.kt:59:23 'val uiImplementation: UIImplementation!' is deprecated. Deprecated in Java.
> Task :app:generateCodegenArtifactsFromSchema SKIPPED
> Task :app:preBuild
> Task :app:preReleaseBuild
> Task :app:generateReleaseResValues
> Task :react-native-safe-area-context:javaPreCompileRelease
> Task :stripe_stripe-react-native:generateReleaseBuildConfig
> Task :stripe_stripe-react-native:javaPreCompileRelease
> Task :react-native-reanimated:bundleLibCompileToJarRelease
> Task :stripe_stripe-react-native:dataBindingMergeDependencyArtifactsRelease
> Task :react-native-safe-area-context:compileReleaseJavaWithJavac
> Task :react-native-safe-area-context:bundleLibRuntimeToDirRelease
> Task :stripe_stripe-react-native:dataBindingGenBaseClassesRelease
> Task :react-native-screens:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :react-native-screens:generateReleaseBuildConfig
> Task :app:mapReleaseSourceSetPaths
> Task :app:generateReleaseResources
> Task :react-native-gesture-handler:compileReleaseKotlin
> Task :app:createReleaseCompatibleScreenManifests
> Task :app:extractDeepLinksRelease
> Task :app:mergeReleaseResources
> Task :app:processReleaseMainManifest
/home/expo/workingdir/build/android/app/src/main/AndroidManifest.xml Warning:
	provider#expo.modules.filesystem.FileSystemFileProvider@android:authorities was tagged at AndroidManifest.xml:0 to replace other declarations but no other declaration present
> Task :react-native-gesture-handler:compileReleaseJavaWithJavac
> Task :app:processReleaseManifest
> Task :app:processApplicationManifestReleaseForBundle
> Task :react-native-gesture-handler:bundleLibRuntimeToDirRelease
> Task :app:checkReleaseAarMetadata
> Task :app:packageReleaseResources
> Task :app:parseReleaseLocalResources
> Task :app:processReleaseManifestForPackage
> Task :stripe_stripe-react-native:compileReleaseKotlin
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/EmbeddedPaymentElementView.kt:10:27 Unresolved reference 'paymentelement'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/EmbeddedPaymentElementView.kt:11:27 Unresolved reference 'paymentelement'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/EmbeddedPaymentElementView.kt:12:27 Unresolved reference 'paymentelement'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/EmbeddedPaymentElementView.kt:20:8 Unresolved reference 'ExperimentalEmbeddedPaymentElementApi'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/EmbeddedPaymentElementView.kt:20:8 Annotation argument must be a compile-time constant.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/EmbeddedPaymentElementView.kt:26:26 Unresolved reference 'EmbeddedPaymentElement'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/EmbeddedPaymentElementView.kt:36:28 Unresolved reference 'EmbeddedPaymentElement'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/EmbeddedPaymentElementView.kt:41:26 Cannot infer type for this parameter. Please specify it explicitly.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/EmbeddedPaymentElementView.kt:41:26 Not enough information to infer type argument for 'T'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/EmbeddedPaymentElementView.kt:41:26 Cannot infer type for this parameter. Please specify it explicitly.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/EmbeddedPaymentElementView.kt:41:26 Property delegate must have a 'getValue(EmbeddedPaymentElementView, KProperty1<EmbeddedPaymentElementView, ERROR CLASS: Cannot infer argument for type parameter T>)' method. None of the following functions is applicable:
fun <T> Lazy<T>.getValue(thisRef: Any?, property: KProperty<*>): T
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/EmbeddedPaymentElementView.kt:41:26 Not enough information to infer type argument for 'T'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/EmbeddedPaymentElementView.kt:41:31 Cannot infer type for this parameter. Please specify it explicitly.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/EmbeddedPaymentElementView.kt:42:5 Unresolved reference 'EmbeddedPaymentElement'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/EmbeddedPaymentElementView.kt:43:32 Cannot infer type for this parameter. Please specify it explicitly.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/EmbeddedPaymentElementView.kt:43:47 Cannot infer type for this parameter. Please specify it explicitly.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/EmbeddedPaymentElementView.kt:64:83 Suspend function 'suspend fun await(): ReadableMap' should be called only from a coroutine or another suspend function.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/EmbeddedPaymentElementView.kt:68:57 Cannot infer type for this parameter. Please specify it explicitly.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/EmbeddedPaymentElementView.kt:68:61 Cannot infer type for this parameter. Please specify it explicitly.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/EmbeddedPaymentElementView.kt:70:14 Cannot infer type for this parameter. Please specify it explicitly.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/EmbeddedPaymentElementView.kt:70:18 Cannot infer type for this parameter. Please specify it explicitly.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/EmbeddedPaymentElementView.kt:78:26 Cannot infer type for this parameter. Please specify it explicitly.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/EmbeddedPaymentElementView.kt:82:18 Unresolved reference 'EmbeddedPaymentElement'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/EmbeddedPaymentElementView.kt:85:18 Unresolved reference 'EmbeddedPaymentElement'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/EmbeddedPaymentElementView.kt:88:18 Unresolved reference 'EmbeddedPaymentElement'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/EmbeddedPaymentElementView.kt:90:43 Unresolved reference 'error'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/EmbeddedPaymentElementView.kt:101:20 Unresolved reference 'rememberEmbeddedPaymentElement'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/EmbeddedPaymentElementView.kt:116:18 Unresolved reference 'EmbeddedPaymentElement'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/EmbeddedPaymentElementView.kt:119:18 Unresolved reference 'EmbeddedPaymentElement'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/EmbeddedPaymentElementView.kt:121:34 Unresolved reference 'error'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/EmbeddedPaymentElementView.kt:144:40 Cannot infer type for this parameter. Please specify it explicitly.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/EmbeddedPaymentElementView.kt:167:13 Unresolved reference 'EmbeddedPaymentElement'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/EmbeddedPaymentElementViewManager.kt:24:27 Unresolved reference 'paymentelement'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/EmbeddedPaymentElementViewManager.kt:25:27 Unresolved reference 'paymentelement'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/EmbeddedPaymentElementViewManager.kt:28:8 Unresolved reference 'ExperimentalEmbeddedPaymentElementApi'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/EmbeddedPaymentElementViewManager.kt:28:8 Annotation argument must be a compile-time constant.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/EmbeddedPaymentElementViewManager.kt:76:31 Cannot infer type for this parameter. Please specify it explicitly.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/EmbeddedPaymentElementViewManager.kt:76:31 Unresolved reference. None of the following candidates is applicable because of a receiver type mismatch:
fun <T, R> T.let(block: (T) -> R): R
    [R|Contract description]
     <
        CallsInPlace(block, EXACTLY_ONCE)
    >
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/EmbeddedPaymentElementViewManager.kt:76:37 Cannot infer type for this parameter. Please specify it explicitly.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/EmbeddedPaymentElementViewManager.kt:86:6 Unresolved reference 'EmbeddedPaymentElement'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/EmbeddedPaymentElementViewManager.kt:152:11 Cannot infer type for this parameter. Please specify it explicitly.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/EmbeddedPaymentElementViewManager.kt:152:15 Cannot infer type for this parameter. Please specify it explicitly.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/EmbeddedPaymentElementViewManager.kt:154:26 Unresolved reference 'EmbeddedPaymentElement'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/EmbeddedPaymentElementViewManager.kt:155:21 Unresolved reference 'EmbeddedPaymentElement'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/EmbeddedPaymentElementViewManager.kt:158:12 Unresolved reference 'EmbeddedPaymentElement'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/EmbeddedPaymentElementViewManager.kt:161:7 Unresolved reference 'EmbeddedPaymentElement'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/EmbeddedPaymentElementViewManager.kt:180:25 Cannot infer type for this parameter. Please specify it explicitly.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/EmbeddedPaymentElementViewManager.kt:180:29 Cannot infer type for this parameter. Please specify it explicitly.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/EmbeddedPaymentElementViewManager.kt:181:25 Cannot infer type for this parameter. Please specify it explicitly.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/EmbeddedPaymentElementViewManager.kt:181:29 Cannot infer type for this parameter. Please specify it explicitly.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentOptionDisplayDataMapper.kt:4:27 Unresolved reference 'paymentelement'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentOptionDisplayDataMapper.kt:5:27 Unresolved reference 'paymentelement'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentOptionDisplayDataMapper.kt:11:8 Unresolved reference 'ExperimentalEmbeddedPaymentElementApi'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentOptionDisplayDataMapper.kt:11:8 Annotation argument must be a compile-time constant.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentOptionDisplayDataMapper.kt:12:5 Unresolved reference 'EmbeddedPaymentElement'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentOptionDisplayDataMapper.kt:14:24 Unresolved reference 'label'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentOptionDisplayDataMapper.kt:15:36 Unresolved reference 'paymentMethodType'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentOptionDisplayDataMapper.kt:16:64 Unresolved reference 'billingDetails'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentSheetAppearance.kt:9:27 Unresolved reference 'paymentelement'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentSheetAppearance.kt:28:23 Cannot infer type for this parameter. Please specify it explicitly.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentSheetAppearance.kt:28:23 Unresolved reference. None of the following candidates is applicable because of a receiver type mismatch:
fun <T, R> T.let(block: (T) -> R): R
    [R|Contract description]
     <
        CallsInPlace(block, EXACTLY_ONCE)
    >
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentSheetAppearance.kt:28:27 Cannot infer type for this parameter. Please specify it explicitly.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentSheetAppearance.kt:29:5 'return' is prohibited here.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentSheetAppearance.kt:29:25 None of the following candidates is applicable:
constructor(): PaymentSheet.Appearance
constructor(colorsLight: PaymentSheet.Colors = ..., colorsDark: PaymentSheet.Colors = ..., shapes: PaymentSheet.Shapes = ..., typography: PaymentSheet.Typography = ..., primaryButton: PaymentSheet.PrimaryButton = ...): PaymentSheet.Appearance
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentSheetAppearance.kt:242:8 Unresolved reference 'ExperimentalEmbeddedPaymentElementApi'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentSheetAppearance.kt:242:8 Annotation argument must be a compile-time constant.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentSheetAppearance.kt:249:28 Unresolved reference 'Embedded'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentSheetAppearance.kt:270:41 Unresolved reference 'Embedded'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentSheetAppearance.kt:316:35 Unresolved reference 'Embedded'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentSheetAppearance.kt:322:33 Unresolved reference 'Embedded'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentSheetAppearance.kt:372:35 Unresolved reference 'Embedded'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentSheetAppearance.kt:377:33 Unresolved reference 'Embedded'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentSheetAppearance.kt:392:33 Unresolved reference 'Embedded'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentSheetAppearance.kt:403:34 Unresolved reference 'Embedded'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentSheetFragment.kt:255:10 Unresolved reference 'cardBrandAcceptance'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentSheetFragment.kt:257:25 Cannot infer type for this parameter. Please specify it explicitly.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentSheetFragment.kt:257:29 Cannot infer type for this parameter. Please specify it explicitly.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentSheetFragment.kt:258:25 Cannot infer type for this parameter. Please specify it explicitly.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentSheetFragment.kt:258:29 Cannot infer type for this parameter. Please specify it explicitly.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentSheetFragment.kt:486:65 Unresolved reference 'LinkConfiguration'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentSheetFragment.kt:488:29 Unresolved reference 'LinkConfiguration'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentSheetFragment.kt:493:27 Unresolved reference 'LinkConfiguration'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentSheetFragment.kt:498:70 Unresolved reference 'LinkConfiguration'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentSheetFragment.kt:500:37 Unresolved reference 'LinkConfiguration'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentSheetFragment.kt:501:33 Unresolved reference 'LinkConfiguration'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentSheetFragment.kt:502:30 Unresolved reference 'LinkConfiguration'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentSheetFragment.kt:628:46 Unresolved reference 'Automatic'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentSheetFragment.kt:656:61 Unresolved reference 'CardBrandAcceptance'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentSheetFragment.kt:657:99 Unresolved reference 'CardBrandAcceptance'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentSheetFragment.kt:658:85 Unresolved reference 'CardBrandAcceptance'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentSheetFragment.kt:661:27 Unresolved reference 'CardBrandAcceptance'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentSheetFragment.kt:663:98 Unresolved reference 'CardBrandAcceptance'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentSheetFragment.kt:664:36 Cannot infer type for this parameter. Please specify it explicitly.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentSheetFragment.kt:664:47 Cannot infer type for this parameter. Please specify it explicitly.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentSheetFragment.kt:666:29 Unresolved reference 'CardBrandAcceptance'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentSheetFragment.kt:668:20 Unresolved reference 'CardBrandAcceptance'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentSheetFragment.kt:671:98 Unresolved reference 'CardBrandAcceptance'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentSheetFragment.kt:672:36 Cannot infer type for this parameter. Please specify it explicitly.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentSheetFragment.kt:672:47 Cannot infer type for this parameter. Please specify it explicitly.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentSheetFragment.kt:674:29 Unresolved reference 'CardBrandAcceptance'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentSheetFragment.kt:676:20 Unresolved reference 'CardBrandAcceptance'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentSheetFragment.kt:678:26 Unresolved reference 'CardBrandAcceptance'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentSheetFragment.kt:682:57 Unresolved reference 'CardBrandAcceptance'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentSheetFragment.kt:684:28 Unresolved reference 'CardBrandAcceptance'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentSheetFragment.kt:685:34 Unresolved reference 'CardBrandAcceptance'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentSheetFragment.kt:686:28 Unresolved reference 'CardBrandAcceptance'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/PaymentSheetFragment.kt:687:32 Unresolved reference 'CardBrandAcceptance'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:48:30 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:123:21 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:124:10 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:125:10 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:126:10 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:127:10 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:128:10 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:130:11 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:131:10 Unresolved reference 'cardBrandAcceptance'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:133:25 Cannot infer type for this parameter. Please specify it explicitly.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:133:29 Cannot infer type for this parameter. Please specify it explicitly.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:134:27 Cannot infer type for this parameter. Please specify it explicitly.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:134:31 Cannot infer type for this parameter. Please specify it explicitly.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:137:26 Cannot infer type for this parameter. Please specify it explicitly.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:137:30 Cannot infer type for this parameter. Please specify it explicitly.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:152:5 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:153:7 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:153:21 None of the following candidates is applicable:
fun create(activity: ComponentActivity, configuration: CustomerSheet.Configuration, customerAdapter: CustomerAdapter, callback: CustomerSheetResultCallback): CustomerSheet
fun create(fragment: Fragment, configuration: CustomerSheet.Configuration, customerAdapter: CustomerAdapter, callback: CustomerSheetResultCallback): CustomerSheet
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:156:22 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:159:5 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:159:20 Unresolved reference 'configure'.
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:164:36 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:166:11 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:167:10 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:168:72 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:168:79 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:171:10 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:172:25 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:172:51 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:172:58 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:175:10 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:176:25 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:176:51 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:176:58 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:195:5 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:195:20 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:248:5 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:248:20 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:255:11 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:255:26 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:261:15 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:262:14 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:263:70 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:263:77 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:266:14 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:267:29 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:267:55 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:267:62 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:270:14 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:271:29 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:271:55 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:271:62 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:341:25 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:341:32 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:342:11 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:342:32 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:350:11 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:350:27 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:352:44 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:354:31 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:354:38 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:360:11 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:360:27 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:362:44 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:367:14 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:369:19 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:386:55 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:389:13 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:390:12 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:392:25 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:392:35 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:392:56 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:392:66 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:395:12 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:398:15 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:398:25 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:399:15 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:399:25 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:400:15 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/CustomerSheetFragment.kt:400:25 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/ReactNativeCustomerAdapter.kt:12:24 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/ReactNativeCustomerAdapter.kt:19:5 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/ReactNativeCustomerAdapter.kt:19:24 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/ReactNativeCustomerAdapter.kt:29:50 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/ReactNativeCustomerAdapter.kt:35:32 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/ReactNativeCustomerAdapter.kt:35:39 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/ReactNativeCustomerAdapter.kt:39:12 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/ReactNativeCustomerAdapter.kt:39:20 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/ReactNativeCustomerAdapter.kt:42:70 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/ReactNativeCustomerAdapter.kt:49:32 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/ReactNativeCustomerAdapter.kt:49:39 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/ReactNativeCustomerAdapter.kt:53:12 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/ReactNativeCustomerAdapter.kt:53:20 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/ReactNativeCustomerAdapter.kt:56:70 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/ReactNativeCustomerAdapter.kt:63:32 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/ReactNativeCustomerAdapter.kt:63:39 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/ReactNativeCustomerAdapter.kt:67:12 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/ReactNativeCustomerAdapter.kt:67:20 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/ReactNativeCustomerAdapter.kt:70:64 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/ReactNativeCustomerAdapter.kt:70:97 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/ReactNativeCustomerAdapter.kt:74:81 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/ReactNativeCustomerAdapter.kt:74:96 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/ReactNativeCustomerAdapter.kt:77:32 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/ReactNativeCustomerAdapter.kt:77:39 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/ReactNativeCustomerAdapter.kt:81:12 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/ReactNativeCustomerAdapter.kt:81:20 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/ReactNativeCustomerAdapter.kt:81:45 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/ReactNativeCustomerAdapter.kt:84:57 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/ReactNativeCustomerAdapter.kt:84:80 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/ReactNativeCustomerAdapter.kt:90:32 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/ReactNativeCustomerAdapter.kt:90:39 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/ReactNativeCustomerAdapter.kt:92:29 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/ReactNativeCustomerAdapter.kt:92:43 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/ReactNativeCustomerAdapter.kt:100:12 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/ReactNativeCustomerAdapter.kt:100:20 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/ReactNativeCustomerAdapter.kt:103:68 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/ReactNativeCustomerAdapter.kt:109:32 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/ReactNativeCustomerAdapter.kt:109:39 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/ReactNativeCustomerAdapter.kt:113:12 This API is under construction. It can be changed or removed at any time (use at your own risk)
e: file:///home/expo/workingdir/build/node_modules/@stripe/stripe-react-native/android/src/main/java/com/reactnativestripesdk/customersheet/ReactNativeCustomerAdapter.kt:113:20 This API is under construction. It can be changed or removed at any time (use at your own risk)
> Task :stripe_stripe-react-native:compileReleaseKotlin FAILED
> Task :app:processReleaseResources
> Task :react-native-screens:compileReleaseKotlin
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/RNScreensPackage.kt:66:17 'constructor(name: String, className: String, canOverrideExistingModule: Boolean, needsEagerInit: Boolean, hasConstants: Boolean, isCxxModule: Boolean, isTurboModule: Boolean): ReactModuleInfo' is deprecated. This constructor is deprecated and will be removed in the future. Use ReactModuleInfo(String, String, boolean, boolean, boolean, boolean)].
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/Screen.kt:46:77 Unchecked cast of '(androidx.coordinatorlayout.widget.CoordinatorLayout.Behavior<android.view.View!>?..androidx.coordinatorlayout.widget.CoordinatorLayout.Behavior<*>?)' to 'com.google.android.material.bottomsheet.BottomSheetBehavior<com.swmansion.rnscreens.Screen>'.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/Screen.kt:378:36 'fun setTranslucent(screen: Screen, activity: Activity?, context: ReactContext?): Unit' is deprecated. For apps targeting SDK 35 or above this prop has no effect because edge-to-edge is enabled by default and the status bar is always translucent.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/Screen.kt:397:36 'fun setColor(screen: Screen, activity: Activity?, context: ReactContext?): Unit' is deprecated. For apps targeting SDK 35 or above this prop has no effect because edge-to-edge is enabled by default and the status bar is always translucent.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/Screen.kt:415:36 'fun setNavigationBarColor(screen: Screen, activity: Activity?): Unit' is deprecated. For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/Screen.kt:432:36 'fun setNavigationBarTranslucent(screen: Screen, activity: Activity?): Unit' is deprecated. For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenStackFragment.kt:217:31 'var targetElevation: Float' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenStackFragment.kt:220:13 'fun setHasOptionsMenu(p0: Boolean): Unit' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenStackFragment.kt:397:18 This declaration overrides a deprecated member but is not marked as deprecated itself. Please add the '@Deprecated' annotation or suppress the diagnostic.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenStackFragment.kt:404:22 'fun onPrepareOptionsMenu(p0: Menu): Unit' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenStackFragment.kt:407:18 This declaration overrides a deprecated member but is not marked as deprecated itself. Please add the '@Deprecated' annotation or suppress the diagnostic.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenStackFragment.kt:412:22 'fun onCreateOptionsMenu(p0: Menu, p1: MenuInflater): Unit' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenStackHeaderConfigViewManager.kt:7:8 'class MapBuilder : Any' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenStackHeaderConfigViewManager.kt:210:9 'class MapBuilder : Any' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenStackHeaderConfigViewManager.kt:212:13 'class MapBuilder : Any' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenStackHeaderConfigViewManager.kt:214:13 'class MapBuilder : Any' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenViewManager.kt:7:8 'class MapBuilder : Any' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenViewManager.kt:204:14 'var statusBarColor: Int?' is deprecated. For apps targeting SDK 35 or above this prop has no effect because edge-to-edge is enabled by default and the status bar is always translucent.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenViewManager.kt:221:14 'var isStatusBarTranslucent: Boolean?' is deprecated. For apps targeting SDK 35 or above this prop has no effect because edge-to-edge is enabled by default and the status bar is always translucent.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenViewManager.kt:238:14 'var navigationBarColor: Int?' is deprecated. For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenViewManager.kt:247:14 'var isNavigationBarTranslucent: Boolean?' is deprecated. For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenViewManager.kt:382:48 'class MapBuilder : Any' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenViewManager.kt:383:49 'class MapBuilder : Any' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenViewManager.kt:384:45 'class MapBuilder : Any' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenViewManager.kt:385:52 'class MapBuilder : Any' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenViewManager.kt:386:48 'class MapBuilder : Any' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenViewManager.kt:387:51 'class MapBuilder : Any' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenViewManager.kt:388:56 'class MapBuilder : Any' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenViewManager.kt:389:57 'class MapBuilder : Any' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenViewManager.kt:390:51 'class MapBuilder : Any' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:55:42 'fun replaceSystemWindowInsets(p0: Int, p1: Int, p2: Int, p3: Int): WindowInsetsCompat' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:56:39 'val systemWindowInsetLeft: Int' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:58:39 'val systemWindowInsetRight: Int' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:59:39 'val systemWindowInsetBottom: Int' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:102:53 'var statusBarColor: Int' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:106:37 'var statusBarColor: Int?' is deprecated. For apps targeting SDK 35 or above this prop has no effect because edge-to-edge is enabled by default and the status bar is always translucent.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:113:48 'var statusBarColor: Int' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:116:32 'var statusBarColor: Int' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:162:49 'var isStatusBarTranslucent: Boolean?' is deprecated. For apps targeting SDK 35 or above this prop has no effect because edge-to-edge is enabled by default and the status bar is always translucent.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:218:43 'var navigationBarColor: Int?' is deprecated. For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:218:72 'var navigationBarColor: Int' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:224:16 'var navigationBarColor: Int' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:241:55 'var isNavigationBarTranslucent: Boolean?' is deprecated. For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:283:13 'fun setColor(screen: Screen, activity: Activity?, context: ReactContext?): Unit' is deprecated. For apps targeting SDK 35 or above this prop has no effect because edge-to-edge is enabled by default and the status bar is always translucent.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:285:13 'fun setTranslucent(screen: Screen, activity: Activity?, context: ReactContext?): Unit' is deprecated. For apps targeting SDK 35 or above this prop has no effect because edge-to-edge is enabled by default and the status bar is always translucent.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:289:13 'fun setNavigationBarColor(screen: Screen, activity: Activity?): Unit' is deprecated. For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:290:13 'fun setNavigationBarTranslucent(screen: Screen, activity: Activity?): Unit' is deprecated. For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:354:42 'var statusBarColor: Int?' is deprecated. For apps targeting SDK 35 or above this prop has no effect because edge-to-edge is enabled by default and the status bar is always translucent.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:356:48 'var isStatusBarTranslucent: Boolean?' is deprecated. For apps targeting SDK 35 or above this prop has no effect because edge-to-edge is enabled by default and the status bar is always translucent.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:359:57 'var navigationBarColor: Int?' is deprecated. For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:360:63 'var isNavigationBarTranslucent: Boolean?' is deprecated. For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/SearchBarManager.kt:5:8 'class MapBuilder : Any' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/SearchBarManager.kt:142:9 'class MapBuilder : Any' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/SearchBarManager.kt:144:13 'class MapBuilder : Any' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/SearchBarManager.kt:146:13 'class MapBuilder : Any' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/SearchBarManager.kt:148:13 'class MapBuilder : Any' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/SearchBarManager.kt:150:13 'class MapBuilder : Any' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/SearchBarManager.kt:152:13 'class MapBuilder : Any' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/SearchBarManager.kt:154:13 'class MapBuilder : Any' is deprecated. Deprecated in Java.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/BottomSheetDialogRootView.kt:7:8 'object ReactFeatureFlags : Any' is deprecated. Use com.facebook.react.internal.featureflags.ReactNativeFeatureFlags instead.
w: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/BottomSheetDialogRootView.kt:25:13 'object ReactFeatureFlags : Any' is deprecated. Use com.facebook.react.internal.featureflags.ReactNativeFeatureFlags instead.
[Incubating] Problems report is available at: file:///home/expo/workingdir/build/android/build/reports/problems/problems-report.html
Deprecated Gradle features were used in this build, making it incompatible with Gradle 9.0.
You can use '--warning-mode all' to show the individual deprecation warnings and determine if they come from your own scripts or plugins.
For more on this, please refer to https://docs.gradle.org/8.13/userguide/command_line_interface.html#sec:command_line_warnings in the Gradle documentation.
346 actionable tasks: 345 executed, 1 up-to-date
FAILURE: Build failed with an exception.
* What went wrong:
Execution failed for task ':stripe_stripe-react-native:compileReleaseKotlin'.
> A failure occurred while executing org.jetbrains.kotlin.compilerRunner.GradleCompilerRunnerWithWorkers$GradleKotlinCompilerWorkAction
   > Compilation error. See log for more details
* Try:
> Run with --stacktrace option to get the stack trace.
> Run with --info or --debug option to get more log output.
> Run with --scan to get full insights.
> Get more help at https://help.gradle.org.
BUILD FAILED in 3m 31s
Error: Gradle build failed with unknown error. See logs for the "Run gradlew" phase for more information.