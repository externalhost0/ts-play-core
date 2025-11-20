/**
 * @module   camera.ts
 * @desc     Webcam initialization and helper
 * @category public
 * 
 * Initializes a user-facing camera and returns a video element (initialized asynchronously).
 */

/**
 * Callback function called when camera is ready
 */
export type CameraCallback = (stream: MediaStream) => void;

/**
 * Singleton video element
 */
let video: HTMLVideoElement | undefined;

/**
 * Initializes the user-facing camera
 * @param callback - Optional callback function called when camera is ready
 * @returns HTMLVideoElement that will stream camera feed
 * @throws {DOMException} If getUserMedia is not supported by the browser
 * 
 * @example
 * const videoElement = init((stream) => {
 *   console.log('Camera ready!', stream);
 * });
 */
export function init(callback?: CameraCallback): HTMLVideoElement {
	// Avoid double init of video object
	video = video || getUserMedia(callback);
	return video;
}

/**
 * Gets user media and creates video element
 * @see https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
 */
function getUserMedia(callback?: CameraCallback): HTMLVideoElement {
	// getUserMedia is not supported by browser
	if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
		throw new DOMException('getUserMedia not supported in this browser');
	}

	// Create a video element
	const video = document.createElement('video');
	video.setAttribute('playsinline', ''); // Required to work in iOS 11 & up

	const constraints: MediaStreamConstraints = {
		audio: false,
		video: { facingMode: 'user' }
	};

	navigator.mediaDevices
		.getUserMedia(constraints)
		.then((stream: MediaStream) => {
			// Modern browsers support srcObject
			video.srcObject = stream;
		})
		.catch((err: DOMException) => {
			let msg = 'No camera available.';
			// Check for permission denied (note: err.code is deprecated, use err.name instead)
			if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
				msg = 'User denied access to use camera.';
			}
			console.log(msg);
			console.error(err);
		});

	video.addEventListener('loadedmetadata', () => {
		video.play();
		if (typeof callback === 'function' && video.srcObject) {
			callback(video.srcObject as MediaStream);
		}
	});

	return video;
}

/**
 * Default export with init function
 */
export default { init };