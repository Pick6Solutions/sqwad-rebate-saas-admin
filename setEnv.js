const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

// Path to your .runtimeconfig.json file
const runtimeConfigPath = path.join(__dirname, 'functions', '.runtimeconfig.json');

// Load the existing runtimeconfig file or create a new one if it doesn't exist
let runtimeConfig = {};
if (fs.existsSync(runtimeConfigPath)) {
    runtimeConfig = JSON.parse(fs.readFileSync(runtimeConfigPath, 'utf-8'));
} else {
    runtimeConfig = {
        env: {},
        envvariables: {}
    };
}

// Function to update the runtimeconfig file
function updateRuntimeConfig(key, value) {
    if (key.toLowerCase() !== "react_app_mlb_team_id" &&
        key.toLowerCase() !== "react_app_stat_feed_team_id" &&
        key.toLowerCase() !== "react_app_time_zone" &&
        key.toLowerCase() !== "react_app_stat_feed") {
        return;
    }

    runtimeConfig.env[key.toLowerCase()] = value;
}

// Load environment variables from .env and update in runtimeconfig
for (const key in process.env) {
    if (Object.hasOwnProperty.call(process.env, key)) {
        updateRuntimeConfig(key.toLowerCase(), process.env[key]);
    }
}

// Write the updated runtimeconfig to the .runtimeconfig.json file
fs.writeFileSync(
    runtimeConfigPath,
    JSON.stringify(runtimeConfig, null, 2),
    'utf-8'
);

console.log(`Updated ${runtimeConfigPath} with environment variables.`);
