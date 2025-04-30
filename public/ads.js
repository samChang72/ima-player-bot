// Copyright 2013 Google Inc. All Rights Reserved.
// You may study, modify, and use this example for any purpose.
// Note that this example is provided "as is", WITHOUT WARRANTY
// of any kind either expressed or implied.

let adsManager;
let adsLoader;
let adDisplayContainer;
let intervalTimer;
let isAdPlaying;
let isContentFinished;
let playButton;
let videoContent;

/**
 * Initializes IMA setup.
 */
function init() {
  videoContent = document.getElementById('contentElement');
  playButton = document.getElementById('playButton');
  playButton.addEventListener('click', playAds);
  setUpIMA();
  checkMutedAutoplaySupport();
}
function checkMutedAutoplaySupport() {
    videoContent.volume = 0;
    videoContent.muted = true;
    var playPromise = videoContent.play();
    if (playPromise !== undefined) {
      playPromise.then(onMutedAutoplaySuccess).catch(onMutedAutoplayFail);
    }
  }

/**
 * Sets up IMA ad display container, ads loader, and makes an ad request.
 */
function setUpIMA() {
  // Create the ad display container.
  createAdDisplayContainer();
  // Create ads loader.
  adsLoader = new google.ima.AdsLoader(adDisplayContainer);
  // Listen and respond to ads loaded and error events.
  adsLoader.addEventListener(
      google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
      onAdsManagerLoaded, false);
  adsLoader.addEventListener(
      google.ima.AdErrorEvent.Type.AD_ERROR, onAdError, false);

  // An event listener to tell the SDK that our content video
  // is completed so the SDK can play any post-roll ads.
  const contentEndedListener = function() {
    // An ad might have been playing in the content element, in which case the
    // content has not actually ended.
    if (isAdPlaying) return;
    isContentFinished = true;
    adsLoader.contentComplete();
  };
  videoContent.onended = contentEndedListener;

  // Request video ads.
  const adsRequest = new google.ima.AdsRequest();
  adsRequest.adTagUrl = 'https://staging.onead.com.tw/gos/vast/1000135?category=-1&dedicated_pid=1435778';
  adsRequest.setAdWillPlayMuted(true); // 設定廣告靜音播放

  // Specify the linear and nonlinear slot sizes. This helps the SDK to
  // select the correct creative if multiple are returned.
  adsRequest.linearAdSlotWidth = 640;
  adsRequest.linearAdSlotHeight = 400;

  adsRequest.nonLinearAdSlotWidth = 640;
  adsRequest.nonLinearAdSlotHeight = 150;

  adsLoader.requestAds(adsRequest);
}

/**
 * Sets the 'adContainer' div as the IMA ad display container.
 */
function createAdDisplayContainer() {
  // We assume the adContainer is the DOM id of the element that will house
  // the ads.
  adDisplayContainer = new google.ima.AdDisplayContainer(
      document.getElementById('adContainer'), videoContent);
}

/**
 * Loads the video content and initializes IMA ad playback.
 */
function playAds() {
  // Initialize the container. Must be done through a user action on mobile
  // devices.
  videoContent.load();
  adDisplayContainer.initialize();

  try {
    // Initialize the ads manager. Ad rules playlist will start at this time.
    adsManager.init(640, 360, google.ima.ViewMode.NORMAL);
    // Call play to start showing the ad. Single video and overlay ads will
    // start at this time; the call will be ignored for ad rules.
    adsManager.start();
    
  } catch (adError) {
    // An error may be thrown if there was a problem with the VAST response.
    videoContent.play();
  }
}

/**
 * Handles the ad manager loading and sets ad event listeners.
 * @param {!google.ima.AdsManagerLoadedEvent} adsManagerLoadedEvent
 */
function onAdsManagerLoaded(adsManagerLoadedEvent) {
  // Get the ads manager.
  const adsRenderingSettings = new google.ima.AdsRenderingSettings();
  adsRenderingSettings.restoreCustomPlaybackStateOnAdBreakComplete = true;
  // videoContent should be set to the content video element.
  adsManager =
      adsManagerLoadedEvent.getAdsManager(videoContent, adsRenderingSettings);

  // Add listeners to the required events.
  adsManager.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR, onAdError);
  adsManager.addEventListener(
      google.ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED, onContentPauseRequested);
  adsManager.addEventListener(
      google.ima.AdEvent.Type.CONTENT_RESUME_REQUESTED,
      onContentResumeRequested);
  adsManager.addEventListener(
      google.ima.AdEvent.Type.ALL_ADS_COMPLETED, onAdEvent);

  // Listen to any additional events, if necessary.
  adsManager.addEventListener(google.ima.AdEvent.Type.LOADED, onAdEvent);
  adsManager.addEventListener(google.ima.AdEvent.Type.STARTED, onAdEvent);
  adsManager.addEventListener(google.ima.AdEvent.Type.COMPLETE, onAdEvent);
  playAds();
}

/**
 * Handles actions taken in response to ad events.
 * @param {!google.ima.AdEvent} adEvent
 */
function onAdEvent(adEvent) {
  // Retrieve the ad from the event. Some events (for example,
  // ALL_ADS_COMPLETED) don't have ad object associated.
  const ad = adEvent.getAd();
  switch (adEvent.type) {
    case google.ima.AdEvent.Type.LOADED:
      // This is the first event sent for an ad - it is possible to
      // determine whether the ad is a video ad or an overlay.
      if (!ad.isLinear()) {
        // Position AdDisplayContainer correctly for overlay.
        // Use ad.width and ad.height.
        videoContent.play();
      }
      break;
    case google.ima.AdEvent.Type.STARTED:
      // This event indicates the ad has started - the video player
      // can adjust the UI, for example display a pause button and
      // remaining time.
      if (ad.isLinear()) {
        // For a linear ad, a timer can be started to poll for
        // the remaining time.
        intervalTimer = setInterval(
            function() {
              // Example: const remainingTime = adsManager.getRemainingTime();
            },
            300);  // every 300ms
      }
      break;
    case google.ima.AdEvent.Type.COMPLETE:
      // This event indicates the ad has finished - the video player
      // can perform appropriate UI actions, such as removing the timer for
      // remaining time detection.
      if (ad.isLinear()) {
        clearInterval(intervalTimer);
      }
      break;
  }
}

/**
 * Handles ad errors.
 * @param {!google.ima.AdErrorEvent} adErrorEvent
 */
function onAdError(adErrorEvent) {
  // Handle the error logging.
  console.log(adErrorEvent.getError());
  adsManager.destroy();
}

/**
 * Pauses video content and sets up ad UI.
 */
function onContentPauseRequested() {
  isAdPlaying = true;
  videoContent.pause();
  // This function is where you should setup UI for showing ads (for example,
  // display ad timer countdown, disable seeking and more.)
  // setupUIForAds();
}

/**
 * Resumes video content and removes ad UI.
 */
function onContentResumeRequested() {
  isAdPlaying = false;
  if (!isContentFinished) {
    videoContent.play();
  }
  // This function is where you should ensure that your UI is ready
  // to play content. It is the responsibility of the Publisher to
  // implement this function when necessary.
  // setupUIForContent();
}

/**
 * Initializes ad with autoplay check.
 * @param {boolean} autoPlay
 */
function initializeAd(autoPlay = false) {
  const adContainer = document.getElementById('adContainer');
  const adDisplayContainer = new google.ima.AdDisplayContainer(adContainer);

  // 等待使用者互動後初始化
  const initializeAds = () => {
    adDisplayContainer.initialize();

    const adsLoader = new google.ima.AdsLoader(adDisplayContainer);

    // 廣告請求邏輯
    const adsRequest = new google.ima.AdsRequest();
    adsRequest.adTagUrl = 'https://staging.onead.com.tw/gos/vast/1000135?category=-1&dedicated_pid=1435778'; // 使用指定的廣告標籤 URL
    adsRequest.setAdWillPlayMuted(true); // 設定廣告靜音播放

    adsLoader.requestAds(adsRequest);

    adsLoader.addEventListener(
        google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
        (event) => {
          adsManager = event.getAdsManager();
          adsManager.init(640, 360, google.ima.ViewMode.NORMAL);
          adsManager.setVolume(0); // 預設靜音
          adsManager.start();

          setupControls(); // 設定控制項
        }
    );
  };

  if (autoPlay) {
    checkAutoplaySupport(initializeAds);
  } else {
    adContainer.addEventListener('click', initializeAds, { once: true }); // 確保只執行一次
  }
}

/**
 * Checks autoplay support and initializes ads if supported.
 * @param {Function} callback
 */
function checkAutoplaySupport(callback) {
  const videoContent = document.getElementById('videoContent');
  const playPromise = videoContent.play();

  if (playPromise !== undefined) {
    playPromise
        .then(() => {
          videoContent.pause();
          callback(); // 自動播放成功，初始化廣告
        })
        .catch(() => {
          console.warn('自動播放失敗，請使用者互動以啟動廣告');
        });
  }
}

/**
 * Sets up ad controls.
 */
function setupControls() {
  const playButton = document.getElementById('playButton');
  const pauseButton = document.getElementById('pauseButton');
  const muteButton = document.getElementById('muteButton');

  playButton.addEventListener('click', () => {
    if (adsManager) {
      adsManager.resume();
    }
  });

  pauseButton.addEventListener('click', () => {
    if (adsManager) {
      adsManager.pause();
    }
  });

  muteButton.addEventListener('click', () => {
    if (adsManager) {
      const isMuted = adsManager.getVolume() === 0;
      adsManager.setVolume(isMuted ? 1 : 0);
    }
  });
}

// Wire UI element references and UI event listeners.
init();