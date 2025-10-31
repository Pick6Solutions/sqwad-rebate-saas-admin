export const randomInt = (low, high) => {
    return Math.floor((Math.random() * (high - low + 1)) + low);
};

export const validUrl = (str) => {
    try {
        new URL(str);
        return true;
    } catch (err) {
        return false;
    }
};

export const validateEmail = (email) => {
    return validateEmailInternal(email);
};

export const shuffleArray = (array) => {
    let currentIndex = array.length, randomIndex;

    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]
        ];
    }

    return array;
};

export const isObjectEmpty = (obj) => {
    for (let prop in obj) {
        if (obj.hasOwnProperty(prop)) {
            return false;
        }
    }
    return JSON.stringify(obj) === JSON.stringify({});
};

export const findFirstAndLastName = (nameString) => {
    let firstName = "";
    let secondName = "";
    if (nameString && nameString.trim()) {
        nameString = nameString.trim();
        if (nameString.indexOf(" ") !== -1) {
            let splitName = nameString.split(" ");
            firstName = splitName[0];
            if (splitName.length >= 2) {
                secondName = splitName[splitName.length - 1];
            }
        }
    }
    return [firstName, secondName];
};

// Internal utility function
const validateEmailInternal = (email) => {
    if (typeof email !== "string") {
        return false;
    }
    const re = /^(([^<>()[\]\\.,;:\s@]+(\.[^<>()[\]\\.,;:\s@]+)*)|(.+))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
};
