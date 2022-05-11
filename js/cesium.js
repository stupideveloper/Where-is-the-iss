// @ts-check
import { RequestState, RequestType, ShadowMode } from "cesium";
import {SkyAtmosphere, SunLight,Viewer,Globe,JulianDate,ClockRange,Cartesian3,SampledPositionProperty,Color, viewerPerformanceWatchdogMixin, SceneMode} from "cesium";
import { twoline2satrec,propagate, gstime, eciToGeodetic } from "satellite.js";

const startJS = new Date()
const overTime = new SampledPositionProperty();
let isComputing = false
let maxLoaded = new Date().getTime()

function setLoadStatus(status) {
	const domElem = document.getElementById("loadStatus")
	domElem.innerText = status
}

function computeOverTime(positionsOverTime) {
	setLoadStatus("LAZY LOADING")
	const totalSeconds = 60 * 60;
	const timestepInSeconds = 10;
	const start = JulianDate.fromDate(new Date(maxLoaded));
	const stop = JulianDate.addSeconds(start, totalSeconds, new JulianDate());
	viewer.clock.stopTime = JulianDate.fromDate(new Date(maxLoaded));
	//viewer.clock.currentTime = start.clone();
	//viewer.timeline.zoomTo(start, stop);
	//viewer.clock.multiplier = 40;
	const positions = []
	for (let i = 0; i < totalSeconds; i+= timestepInSeconds) {
		const time = JulianDate.addSeconds(start, i, new JulianDate());
		const jsDate = JulianDate.toDate(time);
	
		const positionAndVelocity = propagate(satrec, jsDate);
		const gmst = gstime(jsDate);
		// @ts-ignore
		const p   = eciToGeodetic(positionAndVelocity.position, gmst);
	
		const position = Cartesian3.fromRadians(p.longitude, p.latitude, p.height * 1000);
		positions.push({time, position})
	}
	positions.forEach(element => {
		setLoadStatus("RENDERING DATA")
		positionsOverTime.addSample(element.time, element.position);
	});
	maxLoaded = JulianDate.toDate(stop).getTime()
	setLoadStatus("LAZY LOADING")

}
const globe = new Globe()
const atmosphere = new SkyAtmosphere()

const viewer = new Viewer('cesiumContainer', {
	// baseLayerPicker: false, geocoder: false, homeButton: false, infoBox: false,
	// navigationHelpButton: false, sceneModePicker: false,
	globe: globe, skyAtmosphere: atmosphere, sceneModePicker: false
});

var clockTick = function (data){
	//console.log(data)
	const startTime   = JulianDate.toDate(new JulianDate(data.startTime.dayNumber, data.startTime.secondsOfDay)),
	endTime           = new Date(maxLoaded),
	currentTime       = JulianDate.toDate(new JulianDate(data._currentTime.dayNumber, data._currentTime.secondsOfDay)),
	totalTime         =  endTime.getTime() - startTime.getTime(),
	timeToEnd         = endTime.getTime() - currentTime.getTime()

	if (timeToEnd < totalTime / 2) {
		console.log("LAZY LOADING DATA")
		if (!isComputing) {
			computeOverTime(overTime)
		}
	} 
	if (viewer.trackedEntity || viewer.scene.camera.getMagnitude() > 8500000) {
		viewer.scene.camera.rotateRight(0.0005)

	}
	
	
	//console.log(timeToEnd,startTime.getTime(),endTime.getTime(),totalTime)
	//console.log(timeToEnd, totalTime)
	//console.log(data)

}





globe.enableLighting = true
globe.showGroundAtmosphere = true


// This causes a bug on android, see: https://github.com/CesiumGS/cesium/issues/7871
// viewer.scene.globe.enableLighting = true;
// These 2 lines are published by NORAD and allow us to predict where
// the ISS is at any given moment. They are regularly updated.
// Get the latest from: https://celestrak.com/satcat/tle.php?CATNR=25544. 
const ISS_TLE = 
`1 25544U 98067A   21121.52590485  .00001448  00000-0  34473-4 0  9997
2 25544  51.6435 213.5204 0002719 305.2287 173.7124 15.48967392281368`;
const satrec = twoline2satrec(
	ISS_TLE.split('\n')[0].trim(), 
	ISS_TLE.split('\n')[1].trim()
);
// Give SatelliteJS the TLE's and a specific time.
// Get back a longitude, latitude, height (km).
// We're going to generate a position every 10 seconds from now until 6 seconds from now. 





// Visualize the satellite with a red dot.
const satellitePoint = viewer.entities.add({
	position: overTime,
	point: { pixelSize: 5, color: Color.RED },
	model: {
		uri: './3d/iss.glb'
	}
});

// Set the camera to follow the satellite 
viewer.trackedEntity = satellitePoint;
// Wait for globe to load then zoom out     


/*
* CAMERA CONFIG
*/
computeOverTime(overTime)

viewer.clock.onTick.addEventListener(clockTick);

const startTime = JulianDate.fromDate(startJS);
viewer.clock.startTime = startTime.clone();
viewer.scene.highDynamicRange = true
viewer.scene.debugShowFramesPerSecond = true
//iewer.scene.debugShowCommands = true
//viewer.scene.debug


globe.showGroundAtmosphere = true
globe.showWaterEffect = true

viewer.scene.fog.enabled = true
viewer.scene.moon.show = true
viewer.scene.sunBloom = true
viewer.scene.sun.glowFactor = 1.3
viewer.scene.useDepthPicking = true

ShadowMode.ENABLED

