import Swal from "sweetalert2";

export const cleanCSVText = (textToClean) => {
    if (textToClean && typeof textToClean === "string"){
        return textToClean.replace(/,/g, '')
    } else {
        return textToClean;
    }
}

export const valueDoesExist = (value) => {
    return !(value === false || value === "" || value === null || value === undefined);
}

export const validUrl = (str) => {
    let pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
        '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
        '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
    return !!pattern.test(str);
}

export const findFirstAndLastName = (nameString) => {
    let firstName = "";
    let secondName = "";
    if(nameString && nameString.trim()) {
        nameString = nameString.trim();
        if (nameString.indexOf(" ") !== -1) {
            let splitName = nameString.split(" ");
            firstName = splitName[0];
            if (splitName.length >= 2) {
                secondName = splitName[splitName.length - 1]
            }
        }
    }
    return [firstName, secondName]
}

export const Capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export const isObjectEmpty = (obj) =>  {
    for(let prop in obj) {
        if(obj.hasOwnProperty(prop)) {
            return false;
        }
    }
    return JSON.stringify(obj) === JSON.stringify({});
}

export const validateEmail = (email) => {
    let re = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/;
    return re.test(email);
}

function toStandardTime(value) {
    if (value !== null && value !== undefined){ //If value is passed in
        if(value.indexOf('AM') > -1 || value.indexOf('PM') > -1){ //If time is already in standard time then don't format.
            return value;
        }
        else {
            if(value.length === 8){ //If value is the expected length for military time then process to standard time.
                let hour = parseInt(value.substring ( 0,2 )); //Extract hour
                const minutes = value.substring ( 3,5 ); //Extract minutes
                let identifier = 'AM'; //Initialize AM PM identifier

                if(hour === 12){ //If hour is 12 then should set AM PM identifier to PM
                    identifier = 'PM';
                }
                if(hour === 0){ //If hour is 0 then set to 12 for standard time 12 AM
                    hour=12;
                }
                if(hour > 12){ //If hour is greater than 12 then convert to standard 12 hour format and set the AM PM identifier to PM
                    hour = hour - 12;
                    identifier='PM';
                }
                return hour.toString() + ':' + minutes + ' ' + identifier; //Return the constructed standard time
            }
            else { //If value is not the expected length than just return the value as is
                return value;
            }
        }
    }
}

function checkIfTimeStampIsInSecondsAndConvert(timeStamp){
    //check if timeStamp is in seconds or milliseconds
    //Its 2020 so for now we can assume milliseconds if timestamp has 13 or more digits
    //This should work until the year 33658 so thats good
    //is milliseconds and javascript prefers milliseconds
    let stringTimeStampLength = 0;
    if(typeof timeStamp !== "string"){
        stringTimeStampLength = timeStamp.toString().length;
    } else {
        stringTimeStampLength = timeStamp.length;
        timeStamp = parseInt(timeStamp);
    }
    if(stringTimeStampLength < 13){
        //is seconds convert to milliseconds
        return new Date(timeStamp*1000)
    } else {
        return new Date(timeStamp)
    }
}

export const getSnapshotFromEndpoint = (endpoint, appDatabasePrimaryFunctions, numberOfResults=null, searchData=null, orderBy=null, equalTo=null) => {
    let baseRef = appDatabasePrimaryFunctions.ref(endpoint);
    if(orderBy){
        baseRef = baseRef.orderByChild(orderBy)
        if(equalTo){
            baseRef = baseRef.equalTo(equalTo)
        }
    }
    if(numberOfResults){
        baseRef = baseRef.limitToFirst(numberOfResults);
    }
    return baseRef.once('value').then(function(snapshot){
        return snapshot;
    })
}

export const convertTimeStampToHumanReadable = (timeStamp) => {
    if (!timeStamp) return;
    const date = checkIfTimeStampIsInSecondsAndConvert(timeStamp);

    const options = {
        month: 'numeric',      // “6”
        day: 'numeric',        // “18”
        year: 'numeric',       // “2025”
        hour: 'numeric',       // “9”
        minute: '2-digit',     // “45”
        hour12: true,          // AM/PM
        timeZoneName: 'short'  // “PDT”
    };

    // e.g. "6/18/2025, 9:45 AM PDT" → strip the comma
    return date.toLocaleString('en-US', options).replace(',', '');
};

export const getRandomInt = (max) => {
    return Math.floor(Math.random() * Math.floor(max));
}

export const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: true,
    timer: 5000,
    timerProgressBar: true,
    icon: "success",
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer)
        toast.addEventListener('mouseleave', Swal.resumeTimer)
    }
})

export const ErrorMessage = Swal.mixin({
    confirmButtonText: 'Ok',
    icon: 'error'
})

export const WarningMessage = Swal.mixin({
    icon: "warning",
    showCancelButton: true
})

export const SuccessMessage = Swal.mixin({
    icon: "success"
})

export const detectHowManyCodesEntered = (codesArray, areLinks, onlySplitOnBreaks=false) => {
    if(!codesArray) return [];
    const splitOnLineBreaks = codesArray.split("\n");
    let splitOnWhiteSpace = codesArray.split(/\s+/);
    let splitOnCommas = codesArray.split(",");
    let splitArray = splitOnLineBreaks;
    if(!onlySplitOnBreaks){
        if(splitOnWhiteSpace.length === splitOnCommas.length){
            splitOnWhiteSpace = codesArray.replace(/,/g, '').split(/\s+/);
            splitOnCommas = codesArray.replace(/\s/g,'').split(",");
        }
        if(splitArray.length < splitOnWhiteSpace.length){
            splitArray = splitOnWhiteSpace
        }
        if(splitArray.length < splitOnCommas.length){
            splitArray = splitOnCommas
        }
    }
    if(areLinks){
        for(const linkIndex in splitArray){
            const link = splitArray[linkIndex];
            if(!validUrl(link)){
                return {message:"Invalid Url", inValidUrl: link};
            }
        }
    }
    return splitArray
}

export const isEmptyHtmlEntity = (htmlString) => {
    if(!htmlString) return true;
    if(typeof htmlString === 'object'){
        htmlString = htmlString.toString('html');
    }
    console.log(htmlString)
    // Remove media tags like <img>, <video>, etc., which are considered rendering elements
    const mediaTagsRegex = /<img[^>]*>|<video[^>]*>|<audio[^>]*>|<iframe[^>]*>/gi;

    // Remove these tags as they render content
    const noMediaContent = htmlString.replace(mediaTagsRegex, '');

    // Remove self-closing and empty tags like <br>, <hr>, etc.
    const cleanedString = noMediaContent
        .replace(/<br\s*\/?>/gi, '')    // Remove <br> tags
        .replace(/<hr\s*\/?>/gi, '')    // Remove <hr> tags (example)
        .replace(/\s/g, '');            // Remove all whitespace

    // Strip empty tags (tags with no content between them)
    const strippedString = cleanedString.replace(/<[^>]+>\s*<\/[^>]+>/g, '');

    // If the stripped string is empty, then the HTML entity has no rendering content
    return strippedString === '';
}

