# XLPostcards: Complete Workflow Analysis & Problem Investigation

**Date:** August 17, 2025  
**Current Version:** 1.14.0  
**Core Issue:** 6x9 postcard back text not appearing in Stannp proofs  

## Current Working vs. Failing Scenarios

### ✅ What Currently WORKS
1. **App Preview Display**: Text shows correctly in the app preview (Image #3)
2. **4x6 Postcards**: Both front and back render correctly for regular postcards
3. **6x9 Front Image**: Front image renders and appears correctly in Stannp proofs
4. **Save to Photos**: ViewShot successfully saves both front and back to photo library

### ❌ What Currently FAILS
1. **6x9 Postcard Back for Stannp**: Message text missing from Stannp proofs (shows white/yellow background)
2. **Large ViewShot Captures**: iOS fails with "drawViewHierarchyInRect was not successful"

## Complete Workflow Analysis

### 1. App Preview Generation (WORKING)
**File:** `app/postcard-preview.tsx`
**Lines:** ~1189-1279

```
User Image → ViewShot (Front) → Display Preview
Message Text → PostcardBackLayout → ViewShot (Back) → Display Preview
```

**Key Components:**
- `ViewShot` component wrapping front image
- `PostcardBackLayout` component rendering text
- `ViewShot` component wrapping back layout
- Both render correctly on screen

**ViewShot Settings (Preview):**
```javascript
// Front ViewShot
options={{
  width: currentDimensions.width,     // 2772x1872 for 6x9
  height: currentDimensions.height,
  quality: 1,
  format: "jpg"
}}

// Back ViewShot  
options={{
  width: currentDimensions.width,     // 2772x1872 for 6x9
  height: currentDimensions.height,
  quality: 1,
  format: "jpg",
  fileName: "postcard-back"
}}
```

### 2. Save to Photos Workflow (WORKING)
**File:** `app/postcard-preview.tsx`
**Function:** `savePostcard()` (Lines 200-282)

```
ViewShot Capture (Front) → Save to Library
ViewShot Capture (Back) → Save to Library
```

**Capture Settings:**
```javascript
// Front
format: 'jpg',
quality: 0.9,
result: 'tmpfile',
...(Platform.OS === 'ios' && { afterScreenUpdates: true })

// Back  
format: 'jpg',
quality: 0.9,
result: 'tmpfile',
...(Platform.OS === 'ios' && { 
  afterScreenUpdates: true,
  snapshotContentContainer: false
})
```

**Fallback Logic:**
- If tmpfile fails → try base64
- Convert base64 to file if needed
- Both front and back save successfully

### 3. Stannp Submission Workflow (FAILING)
**File:** `app/postcard-preview.tsx`
**Function:** `sendToStannp()` (Lines 284-616)

```
Purchase Success → Generate Images → Scale to Print Size → Send to Stannp API
```

**Current Generation Approach (v1.14.0):**
```
User Image → generateCompletePostcardFromViewShot() → Front URI
Message/Address → generateCompletePostcardFromViewShot() → Back URI
Both URIs → Scale to Print Dimensions → Send to Stannp
```

## Detailed Size Analysis

### Front Image Dimensions
- **6x9 Print:** 2754x1872 pixels (300 DPI)
- **6x9 Bleed:** 2772x1890 pixels (adds 9px bleed on all sides)
- **Source:** User's photo scaled to these dimensions
- **Method:** ImageManipulator resize operation
- **Result:** ✅ Works consistently

### Back Image Dimensions  
- **6x9 Print:** 2754x1872 pixels (300 DPI)
- **Source:** PostcardBackLayout React component
- **Method:** ViewShot capture of rendered component
- **Result:** ❌ Fails for Stannp submission

### Size Comparison Question
**Why does front work but back fails if they're the same size?**

**Front Image Processing:**
```
User Photo → ImageManipulator.manipulateAsync() → Scaled Image File
```
- No ViewShot involved
- Pure image scaling operation
- No React component rendering
- Direct file-to-file operation

**Back Image Processing:**
```
React Component → ViewShot.capture() → Image File
```
- Requires ViewShot to capture React component
- Must render PostcardBackLayout with text
- iOS limitation: "drawViewHierarchyInRect was not successful"
- Component hierarchy vs. simple image scaling

## PostcardBackLayout Component Analysis
**File:** `app/components/PostcardBackLayout.tsx`

### Component Structure:
```jsx
<View style={{ width, height, backgroundColor: '#FFFFFF' }}>
  {/* Message Area */}
  <View style={{ position: 'absolute', left: messageLeft, top: messageTop, ... }}>
    <Text style={{ fontSize: messageFontSize, ... }}>
      {message}
    </Text>
  </View>
  
  {/* Address Area */}
  <View style={{ position: 'absolute', left: addressX, top: addressY, ... }}>
    <Text style={{ fontWeight: 'bold', ... }}>{recipientInfo.to}</Text>
    <Text>{recipientInfo.addressLine1}</Text>
    <Text>{recipientInfo.city}, {recipientInfo.state} {recipientInfo.zipcode}</Text>
  </View>
</View>
```

### Layout Calculations:
- **Regular (4x6):** Different positioning and font sizes
- **XL (6x9):** Larger positioning and font sizes
- **Scaling:** All dimensions scale based on actual vs. target size
- **Fonts:** Arial family, calculated sizes, black text on white background

### Working in Preview:
- Component renders correctly
- Text appears properly positioned
- ViewShot captures for display work
- Save to photos works

### Failing for Stannp:
- Same component, same dimensions
- ViewShot capture fails with iOS error
- Results in white/yellow background without text

## iOS ViewShot Limitation Investigation

### Error Pattern:
```
"The view cannot be captured. drawViewHierarchyInRect was not successful. 
This is a potential technical or security limitation."
```

### What We Know:
1. **Size-dependent:** Fails at 2754x1872, might work at smaller sizes
2. **Component-dependent:** Fails for complex React components, works for simple images
3. **iOS-specific:** This is an iOS limitation, not Android
4. **Inconsistent:** Works for preview/save, fails for Stannp generation

### Possible Causes:
1. **Memory limitations:** Large view hierarchies
2. **Security restrictions:** iOS blocking large captures
3. **Component complexity:** PostcardBackLayout vs. simple Image
4. **Timing issues:** When capture is attempted vs. when component is rendered
5. **Context differences:** Preview vs. background generation

## All Solutions Attempted (Chronological)

### 1. ViewShot Optimization (v1.6.x) ❌
**Approach:** Fix ViewShot with various settings
- Progressive fallback strategies
- iOS-specific options (`afterScreenUpdates`, `snapshotContentContainer`)
- Quality reduction, format changes (JPG → PNG)
- Base64 vs tmpfile result formats
**Result:** FAILED - Persistent iOS memory limitations

### 2. SVG Text Rendering (v1.7.x) ❌ 
**Approach:** Generate postcard back programmatically using SVG
- HTML `foreignObject` in SVG with CSS styling
- Native SVG `<text>` elements with word wrapping
- ImageManipulator SVG → PNG conversion
**Result:** FAILED - React Native's ImageManipulator doesn't support SVG text rendering

### 3. Swift Native Module (v1.8.0) ❌
**Approach:** Create iOS-native ViewShot replacement
- Custom Swift module using `UIGraphicsImageRenderer`
- Objective-C bridge for React Native integration
**Result:** FAILED - Module linking issues in Expo environment

### 4. Final ViewShot Optimization (v1.8.1) ❌
**Approach:** Use ViewShot with iOS-optimized settings
- PNG format with `quality: 1.0`
- `snapshotContentContainer: false`
- `afterScreenUpdates: false`
**Result:** FAILED - Same iOS limitation

### 5. React Native Skia (v1.9.0) ❌
**Approach:** Complete ViewShot elimination using Skia rendering
- Direct surface rendering bypasses iOS view capture
- Programmatic image loading and text rendering
**Result:** FAILED - React version dependency conflict (requires React >=19.0)

### 6. WebView Canvas (v1.10.0) ❌
**Approach:** HTML5 Canvas rendering in react-native-webview
- HTML Canvas for text rendering
- Base64 PNG export
**Result:** FAILED - Implementation incomplete, fell back to white background

### 7. Improved SVG (v1.11.0) ❌
**Approach:** Better SVG implementation with react-native-svg
- Proper text wrapping algorithm
- XML escaping for special characters
**Result:** FAILED - ImageManipulator cannot decode SVG files

### 8. Hybrid ViewShot (v1.12.0) ❌
**Approach:** ViewShot for back, ImageManipulator for front
- iOS-optimized ViewShot settings with fallbacks
**Result:** FAILED - Same iOS ViewShot limitation

### 9. Scaled ViewShot (v1.13.0) ❌
**Approach:** Capture at smaller size and scale up
- Capture at 33% size (~924x624 pixels)
- Scale up with ImageManipulator
**Result:** FAILED - Even small captures fail with same iOS error

### 10. Reuse Working ViewShot (v1.14.0) ❌
**Approach:** Use exact same ViewShot logic from working save function
- Copy identical capture code from savePostcard function
- Same fallback strategy (tmpfile → base64)
**Result:** FAILED - Same iOS limitation persists

## Critical Questions & Observations

### Q1: Why does save work but Stannp generation fail?
**Hypothesis:** Timing and context differences
- Save function captures already-rendered preview components
- Stannp generation might be attempting capture at different time
- Component might not be fully rendered when capture attempted

### Q2: Why does front work but back fail at same dimensions?
**Answer:** Different processing methods
- **Front:** ImageManipulator scaling (no ViewShot)
- **Back:** ViewShot capture of React component (fails)

### Q3: Is the issue actually ViewShot or something else?
**Evidence for ViewShot being the problem:**
- Consistent "drawViewHierarchyInRect was not successful" error
- Works in some contexts (save), fails in others (Stannp)
- Front image (no ViewShot) works consistently

**Evidence against ViewShot being the only problem:**
- Save function uses ViewShot successfully
- Preview display uses ViewShot successfully
- Only fails in Stannp generation context

### Q4: Could it be a component state/timing issue?
**Possible factors:**
- Component not fully rendered when capture attempted
- State changes between preview and generation
- Different React lifecycle timing
- Memory pressure during purchase flow

## Alternative Approaches Not Yet Tried

### 1. Server-Side Rendering
**Approach:** Generate images on server
- Send message/address data to server
- Server generates postcard back image
- Return image URL for Stannp submission
**Pros:** Bypasses iOS limitations entirely
**Cons:** Requires server infrastructure

### 2. Native iOS Image Generation
**Approach:** Pure iOS text rendering
- Use iOS Core Graphics to draw text
- Bypass React Native ViewShot entirely
- Direct iOS canvas operations
**Pros:** Full control over rendering
**Cons:** Complex native module development

### 3. Pre-rendered Template Approach
**Approach:** Create template images with text overlays
- Generate base template images
- Use simple text overlay APIs
- Minimal ViewShot usage
**Pros:** Reduces ViewShot complexity
**Cons:** Less flexible layout

### 4. Component Simplification
**Approach:** Reduce PostcardBackLayout complexity
- Remove nested Views
- Simplify component hierarchy
- Single-level component structure
**Pros:** Might avoid iOS limitations
**Cons:** May affect layout quality

## Key Insights

1. **The Problem is Context-Specific:** ViewShot works in some scenarios (save, preview) but fails in others (Stannp generation)

2. **Size is Not the Only Factor:** Even scaled-down captures fail, suggesting component complexity or timing issues

3. **Front vs. Back Processing Difference:** Front uses ImageManipulator (works), back uses ViewShot (fails)

4. **iOS Limitation is Real:** Multiple approaches confirm iOS has fundamental restrictions

5. **Text Rendering Works:** PostcardBackLayout successfully renders text in preview

## Recommendations for Next Steps

1. **Debug Timing Issues:** Investigate when/how ViewShot is called in Stannp flow vs. save flow
2. **Component Simplification:** Try simpler PostcardBackLayout structure
3. **Alternative Text Rendering:** Consider non-ViewShot approaches for text
4. **Server-Side Solution:** Most reliable long-term solution
5. **Hybrid Approach:** Use working front generation + alternative back generation

## File References

- **Main Preview:** `app/postcard-preview.tsx`
- **Back Layout:** `app/components/PostcardBackLayout.tsx`
- **Print Specs:** `utils/printSpecs.ts`
- **Various Generators:** `utils/*PostcardGenerator.ts`
- **Summary Doc:** `POSTCARD_RENDERING_SUMMARY.md`