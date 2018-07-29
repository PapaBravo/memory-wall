const pages = document.getElementsByClassName('page');

const albumKey = 'photos/';
const bucketName = 'memory-wall';


pages[0].style.display = 'block';

const inputPhoto = document.getElementById('input-photo');
const imageContainer = document.getElementById('image-container');

AWS.config.update({
    region: 'eu-central-1',
    credentials: new AWS.CognitoIdentityCredentials({
        IdentityPoolId: 'eu-central-1:dde322a9-fc9b-4290-b627-6193ee4de47d',
    })
})

var s3 = new AWS.S3({
    apiVersion: '2006-03-01',
    params: { Bucket: bucketName }
});

function onPhotoInputChange(e) {

    s3.upload({
        Key: albumKey + e.target.files[0].name,
        Body: e.target.files[0],
        ACL: 'public-read'
    }, (err, data) => {
        if (err) {
            console.error(err)
        } else {
            console.info('Successfully uploaded photo.');
        }
    });
}

function showImages() {
    s3.listObjects({ Prefix: albumKey }, function (err, data) {
        if (err) {
            console.error(err);
            return;
        }
        // `this` references the AWS.Response instance that represents the response
        const href = this.request.httpRequest.endpoint.href;
        const bucketUrl = href + bucketName + '/';
        const photoHtml = data.Contents.map(c => {
            const url = bucketUrl + encodeURIComponent(c.Key);
            console.log(url)
            return `
                <div class="polaroid">
                    <p>Sarah, Dec '02</p>
                    <img src="${url}" />
                </div>
            `
        })
            .join('');
        pages[1].style.display = 'block';
        imageContainer.innerHTML = photoHtml;
    })
}

inputPhoto.addEventListener('change', onPhotoInputChange);
showImages();