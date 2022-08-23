updateTrackable(obj) {
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
                console.log(centroid[0], centroid[1], x_direction, y_direction);
                to.counted = true;
            }
        }
        this.trackableObjects[objectID] = to;
    })
}