const pages = document.getElementsByClassName('page');

pages[0].style.display = 'block';

const inputPhoto = document.getElementById('input-photo');

AWS.config.update({
    region: 'eu-central-1',
    credentials: new AWS.CognitoIdentityCredentials({
        IdentityPoolId: 'eu-central-1:dde322a9-fc9b-4290-b627-6193ee4de47d',
    })
})

var s3 = new AWS.S3({
    apiVersion: '2006-03-01',
    params: { Bucket: 'memory-wall' }
});

function onPhotoInputChange(e) {

    s3.upload({
        Key: 'photos/' + e.target.files[0].name,
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

inputPhoto.addEventListener('change', onPhotoInputChange);