let video;
let detector;
let detections = [];
let ep = 20;
let count = 0;
let totalIn = 0;
let totalOut = 0
    /// 質心追蹤
let old = [0, 0];
const t0 = performance.now();
let flag = 1;
let ptime = -1;
let gaptime=-2;
//const CentroidTracker = require('./Centroid_tracker.js')

const argsort = arr => arr.map((v, i) => [v, i]).sort().map(a => a[1]);

function fetchss(cx, cy, dx, dy) {
    old[0] = cx;
    old[1] = cy;
    // if (((cx < 320 + ep) && (cx > 320 - ep)) && dx < 0) {
    //     totalIn += 1;
    // }
    // if (((cx < 320 + ep) && (cx > 320 - ep)) && dx > 0) {
    //     totalOut += 1;
    // }
    if (((cx < 320 + ep)) && dx < 0) {
        totalIn += 1;
    }
    if (((cx > 320 - ep)) && dx > 0) {
        totalOut += 1;
    }
    /*
      if (cx > 240 && dx < 0) {
          totalIn += 1;
      }
      if (cx < 240 && dx > 0) {
          totalOut += 1;
      }*/
    console.log(totalIn, totalOut);
    return 0;
}
class TrackableObject {
    constructor(objectID, centroid) {
        this.objectID = objectID;
        this.centroids = [centroid];
        this.counted = false;
    }
};

class CentroidTracker {
    constructor(maxDisappeared = 50) {
        this.nextObjectID = 0;
        this.objects = {};
        this.disappeared = {};
        this.trackableObjects = {};

        // store the number of maximum consecutive updates a given
        // object is allowed to be marked as "disappeared" until we
        // need to deregister the object from tracking
        this.maxDisappeared = maxDisappeared;
    };

    euclideanDistance(a, b) {
        const dx = a[0] - b[0];
        const dy = a[1] - b[1];
        return Math.sqrt(dx * dx + dy * dy);
    };

    register(centroid) {
        this.objects[this.nextObjectID] = centroid;
        this.disappeared[this.nextObjectID] = 0;
        this.nextObjectID++;
    };


    deregister(objectID) {
        delete this.objects[objectID]
        delete this.disappeared[objectID]
        delete this.trackableObjects[objectID]
    };
    ///////////////////////////另一個函式 update
    update(rects) {
        if (rects.length == 0) {
            Object.keys(this.disappeared).forEach(objectID => {
                this.disappeared[objectID] += 1;
                if (this.disappeared[objectID] > this.maxDisappeared) {
                    this.deregister(objectID);
                }
            })
            return Object.assign({}, this.objects);
        }

        let inputCentroids = [];
        for (let i = 0; i < rects.length; i++) {
            inputCentroids.push([~~((rects[i].topLeft[0] + rects[i].bottomRight[0]) / 2), ~~((rects[i].topLeft[1] + rects[i].bottomRight[1]) / 2)]);
        }
        if (Object.keys(this.objects).length == 0) {
            inputCentroids.forEach(centroid => {
                this.register(centroid);
            })
        } else {
            const objectIDs = Object.keys(this.objects);
            const objectCentroids = objectIDs.map(id => {
                return this.objects[id];
            });

            let D = new Array(this.objects.length);
            for (let i = 0; i < objectCentroids.length; i++) {
                D[i] = new Array(inputCentroids.length)
                for (let j = 0; j < inputCentroids.length; j++) {
                    D[i][j] = this.euclideanDistance(inputCentroids[j], objectCentroids[i]);
                }
            }
            let mins = [];
            let argsMin = [];
            for (let i = 0; i < D.length; i++) {
                mins.push(Math.min(...D[i]));
                let mn = D[i][0];
                argsMin.push(0)

                for (let j = 1; j < D[i].length; j++) {
                    if (D[i][j] <= mn) {
                        mn = D[i][j];
                        argsMin[i] = j;
                    }
                }
            }

            const rows = argsort(mins);
            let cols = [];
            for (let i = 0; i < argsMin.length; i++) {
                cols.push(argsMin[rows[i]])
            }

            let usedRows = [];
            let usedCols = [];
            for (let i = 0; i < rows.length; i++) {
                if (usedRows.includes(rows[i]) || usedCols.includes(cols[i])) {
                    continue;
                }
                const objID = objectIDs[rows[i]];
                this.objects[objID] = inputCentroids[cols[i]]
                this.disappeared[objID] = 0;
                usedRows.push(rows[i]);
                usedCols.push(cols[i]);
            }

            let unusedRows = [];
            let unusedCols = [];
            for (let i = 0; i < D.length; i++) {
                if (!(usedRows.includes(i))) {
                    unusedRows.push(i);
                }
            }
            for (let i = 0; i < D[0].length; i++) {
                if (!(usedCols.includes(i))) {
                    unusedCols.push(i);
                }
            }

            if (D.length >= D[0].length) {
                unusedRows.forEach(row => {
                    const id = objectIDs[row];
                    this.disappeared[id] += 1;
                    if (this.disappeared[id] > this.maxDisappeared) {
                        this.deregister(id);
                    }
                })
            } else {
                unusedCols.forEach(col => {
                    this.register(inputCentroids[col]);
                })
            }
        }
        console.log("___Before___");
        //debugger;
        this.updateTrackable(this.objects); ///////////////呼叫的地方
        //debugger;
        console.log("___After___");
        return Object.assign({}, this.objects);
    };
    ////////////////////////

    ///////沒有回傳的part
    updateTrackable(obj) {
        console.log("Trackable");
        Object.entries(obj).forEach(([objectID, centroid]) => {
            debugger;
            console.log("8888");
            let to = this.trackableObjects[objectID];
            if (to == null || to == undefined) {
                to = new TrackableObject(objectID, centroid);
            } else {
                let x = to.centroids.map(c => {
                    return c[0];
                })
                let y = to.centroids.map(c => {
                    return c[1];
                })
                let x_mean = 0;
                let y_mean = 0;
                x.forEach(elem => {
                    x_mean += elem;
                })
                x_mean /= x.length;
                const x_direction = centroid[0] - x_mean;
                y.forEach(elem => {
                    y_mean += elem;
                })
                y_mean /= y.length;
                const y_direction = centroid[1] - y_mean;
                to.centroids.push(centroid);
                if (to.counted === false) {
                    console.log("3333");
                    console.log(~~(centroid[0]), ~~(centroid[1]), ~~(x_direction), ~~(y_direction));
                    to.counted = true;
                }
            }
            this.trackableObjects[objectID] = to;
        });

        return Object.assign({}, this.objects);
    }
};
//////////沒有回傳的part

let ct = new CentroidTracker(maxDisappeared = 60);

function preload() {
    detector = ml5.objectDetector('cocossd');
}

function gotDetections(error, results) {
    if (error) {
        console.error(error);
    }
    detections = results;

    detector.detect(video, gotDetections);
}

function setup() {
    let cnv = createCanvas(640, 480);
    cnv.parent('sketch-holder');
    video = createCapture(VIDEO);
    video.hide();
    video.size(640, 480);
    detector.detect(video, gotDetections);
    count = 30;
    //cnv.position(300, 250, 'flex');
    //console.log("jjj")
}

function draw() {
    //background(150);
    image(video, 0, 0)
        //line(0, 240, 640, 240);
    strokeWeight();
    //stroke(0, 0, 0);
    line(0, 240, 640, 240);

    stroke(0, 255, 0);
    fill(255);

    //text(object.label, object.x + 10, object.y + 24);

    //text('Exit ' + totalOut, 1, 30);
    //text('Enter ' + totalIn, 1, 60);


    count = count + totalOut - totalIn;
    text('Total people inside ' + count, 1, 120);
    totalOut = 0;
    totalIn = 0;
    let tim=gaptime -ptime;
    text('Performance Time ' + ptime + 'milliseconds.', 1, 30);
    text('Gap Time ' + gaptime + 'milliseconds.', 1, 60);
    text('G - P time ' + tim + 'milliseconds.', 1, 90);
    for (let i = 0; i < detections.length; i++) {
        let object = detections[i];
        if (object.label != "person") {
            continue;
        } //motorcycle


        let obj3 = ct.update({ topLeft: [~~(object.x), ~~(object.y)], bottomRight: [~~(object.width), ~~(object.height)] });

        //console.log(tracker.trackableObjects);

        console.log(obj3)
            //ct.updateTrackabled;
            //console.log([~~(object.x), ~~(object.y)], [~~(object.width), ~~(object.height)]);
       // debugger;
        if (old[0] == 0) {
            old[0] = ~~((object.x + object.width) / 2);
            old[1] = ~~((object.y + object.height) / 2);
        } else {

            cx = ~~((object.x + object.width) / 2);
            cy = ~~((object.y + object.height) / 2);
            dx = cx - old[0];
            dy = cy - old[1];
            fetchss(cx, cy, dx, dy);

            //old[0] = ~~((object.x + object.width) / 2);
        }
        textSize(24);
        stroke(0, 255, 0);
        strokeWeight(2);
        noFill();
        rect(object.x, object.y, object.width, object.height);
        //text(object.x, object.x + 10, object.y);
        text(object.label, object.x + 10, object.y + 24);
        if (flag == 1) {
        let t1 = performance.now();
        ptime = t1 - t0;
        flag = 2;
    }else if (flag == 2) {
        let t2 = performance.now();
        gaptime = t2 - t0;
        flag = 0;
    }
        //point(x,y);

    }
}
