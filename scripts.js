// const pages = document.getElementsByClassName('page');

const STORAGE_NAME_KEY = 'mw-name';
const pages = ['snap', 'gallery'];

const albumKey = 'photos/';
const bucketName = 'memory-wall';

/**
 * Displays the indicated page and hides all other pages.
 * @param {'snap'|'gallery'} page 
 */
function showPage(page) {
    pages.forEach(p => {
        const el = document.getElementById(`page-${p}`);
        el.style.display = p === page ? 'block' : 'none'
        initPage(p);
    });
}

function initPage(page) {
    if (page === 'snap') {
        initSnapPage();
    }
}

function initSnapPage() {
    if (!isNameSet()) {
        const name = window.prompt("What's your name?");
        localStorage.setItem(STORAGE_NAME_KEY, name);
    }
}

/**
 * Checks if the device has a camera.
 * @returns {Promise<boolean>}
 */
function hasCamera() {
    return navigator.mediaDevices.enumerateDevices()
        .then(devices => devices.some(d => d.kind === 'videoinput'))
        .catch(err => {
            console.errror(err);
            return false;
        });
}

hasCamera().then(showSnap => showPage(showSnap ? 'snap' : 'gallery'));

AWS.config.update({
    region: 'eu-central-1',
    credentials: new AWS.CognitoIdentityCredentials({
        IdentityPoolId: 'eu-central-1:dde322a9-fc9b-4290-b627-6193ee4de47d',
    })
})

let s3 = new AWS.S3({
    apiVersion: '2006-03-01',
    params: {
        Bucket: bucketName
    }
});

/**
 * Upload file from input event.
 * @param {Event} e 
 */
function onPhotoInputChange(e) {
    s3.upload({
        Key: `${albumKey}${new Date().valueOf()}.jpg`,
        Body: e.target.files[0],
        ACL: 'public-read',
        Metadata: {
            poster: localStorage.getItem(STORAGE_NAME_KEY) || 'unknown'
        },
        CacheControl: 'max-age=172800'
    }, (err, data) => {
        if (err) {
            console.error(err)
        } else {
            console.info('Successfully uploaded photo.');
        }
    });
}

function getOwner(key) {
    return new Promise((resolve, reject) => s3.headObject({
        Key: key
    }, function (err, data) {
        //console.info(key, data, this.httpResponse.headers);
        if (err) reject(err);
        else resolve(data.Metadata.name);
    }));
}

/**
 * Adds the last 4 images from S3 to the photo container
 */
function showImages() {
    s3.listObjects({
        Prefix: albumKey,
        MaxKeys: 5
    }, function (err, data) {
        if (err) {
            console.error(err);
            return;
        }
        // `this` references the AWS.Response instance that represents the response
        const href = this.request.httpRequest.endpoint.href;
        const bucketUrl = href + bucketName + '/';
        const photoHtml = data.Contents
            .filter(c => c.Size) // filter directories
            .sort((a, b) => b.LastModified.valueOf() - a.LastModified.valueOf())
            .slice(0, 4)
            .map(c => {
                //console.info(c)
                getOwner(c.Key).then(console.info.bind(console));
                const url = bucketUrl + encodeURIComponent(c.Key);
                return `
                <div class="polaroid">
                    <p>Sarah, ${c.LastModified}</p>
                    <img src="${url}" />
                </div>
            `
            })
            .join('');
        document.getElementById('image-container').innerHTML = photoHtml;
    })
}

function isNameSet() {
    return !!localStorage.getItem(STORAGE_NAME_KEY);
}

document.getElementById('input-photo').addEventListener('change', onPhotoInputChange);
showImages();