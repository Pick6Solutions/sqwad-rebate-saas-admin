import React, { Component } from 'react';
import { getDatabase, ref, onValue, set, update } from "firebase/database";
import SideMenu from '../admin/SideMenu';
import TopMenu from '../admin/TopBar';
import '../../styles/css/AdminMain.css';
import RichTextMarkdown from "../utils/RichTextMarkdown";
import {
    validateEmail,
    ErrorMessage,
    Toast,
    isEmptyHtmlEntity,
    detectHowManyCodesEntered, WarningMessage
} from '../utils/HelpfulFunction';
//import {database} from "../../base";
const google = window.google;
let geocoder = new google.maps.Geocoder();
const isValidDomain = require('is-valid-domain');

class SetUpLoginVariables extends Component {
    constructor(props) {
        super(props);
        this.state = {
            loading: true,
            tenantVariables: {},
            acceptableDistance: "",
            locationPermissionsBody: "",
            locationPermissionsHeader: "",
            formattedAddress: "",
            notAcceptableLocationMessage: "",
            notAcceptableLocationHeader: "",
            canPlayOutside: false,
            canPlay: false,
            allowList: "",
            blockList: "",
            advanced: false,
        };
        this.handleChange = this.handleChange.bind(this);
        this.handleTextChange = this.handleTextChange.bind(this);
        this.handleRichTextChange = this.handleRichTextChange.bind(this);
    }

    componentDidMount() {
        const db = getDatabase();
        const tenantVariablesRef = ref(db, 'tenantVariables');

        onValue(tenantVariablesRef, (snapshot) => {
            const tenantVariables = snapshot.val() || {};
            let advanced = false;
            if (tenantVariables.doNotCollectEmail || tenantVariables.sanitizeEmails || tenantVariables.allowList || tenantVariables.blockList || tenantVariables.collectDistance || tenantVariables.noMandatoryTermsAndConditions || tenantVariables.collectYesNoQuestion || tenantVariables.keepFansLoggedIn || tenantVariables.collectCustomDropdown || tenantVariables.collectTextQuestion || tenantVariables.collectTextInputOne || tenantVariables.collectTextInputTwo) {
                advanced = true;
            }

            this.setState({
                acceptableDistance: tenantVariables.acceptableDistance,
                customDropdownOptions: tenantVariables.customDropdownOptions,
                locationPermissionsBody: tenantVariables.locationPermissionsBody,
                locationPermissionsHeader: tenantVariables.locationPermissionsHeader,
                formattedAddress: tenantVariables.formattedAddress,
                notAcceptableLocationMessage: tenantVariables.notAcceptableLocationMessage || "",
                yesNoQuestionText: tenantVariables.yesNoQuestionText || "",
                yesNoQuestionText2: tenantVariables.yesNoQuestionText2 || "",
                yesNoQuestionText3: tenantVariables.yesNoQuestionText3 || "",
                notAcceptableLocationHeader: tenantVariables.notAcceptableLocationHeader,
                canPlayOutside: tenantVariables.canPlayOutside,
                allowList: tenantVariables.allowList,
                blockList: tenantVariables.blockList,
                promotionText: tenantVariables.promotionText || "",
                promotionTextTwo: tenantVariables.promotionTextTwo || "",
                promotionTextThree: tenantVariables.promotionTextThree || "",
                promotionTextFour: tenantVariables.promotionTextFour || "",
                collectCustomDropdown: tenantVariables.collectCustomDropdown || false,
                advanced: advanced,
                tenantVariables: tenantVariables,
                loading: false
            });
        });
    }

    async handleChange(evt) {
        const target = evt.target;
        const value = target.type === 'checkbox' ? target.checked : target.value;
        const updates = {};
        updates[`tenantVariables/${target.name}`] = value;
        await update(ref(database), updates)
        this.setState({ [target.name]: value });
    }

    async handleTextChange(evt) {
        const tenantVariablesCopy = this.state.tenantVariables;
        tenantVariablesCopy[evt.target.name] = evt.target.value;
        const updates = {};
        updates[`tenantVariables/${evt.target.name}`] = evt.target.value;
        await update(ref(database), updates)
        this.setState({ tenantVariables: tenantVariablesCopy });
    }

    async selectOption(button) {
        const tenantVariablesCopy = this.state.tenantVariables;
        tenantVariablesCopy[button] = !tenantVariablesCopy[button];
        const updates = {};
        updates[`tenantVariables/${button}`] = tenantVariablesCopy[button];
        await update(ref(database), updates)
        this.setState({ tenantVariables: tenantVariablesCopy });
    }

    updateDistance() {
        const tenantVariables = this.state.tenantVariables;
        if (!this.state.acceptableDistance || !this.state.formattedAddress) {
            ErrorMessage.fire({
                title: 'Hold on!',
                text: "Please make sure all the form fields are filled out"
            });
            return;
        } else if (this.state.acceptableDistance <= 0) {
            ErrorMessage.fire({
                title: 'Hold on!',
                text: "Please make sure distance is greater than 0"
            });
            return;
        }

        const canPlayOutside = this.state.canPlayOutside || false;
        const canPlay = this.state.canPlay || false;
        this.setState({ loading: true });
        const vm = this;
        let notAcceptableLocationMessage = vm.state.notAcceptableLocationMessage;
        geocoder.geocode({ 'address': this.state.formattedAddress }, function (results, status) {
            if (status === 'OK') {
                if (results.length === 1) {
                    const tenantVariablesCopy = tenantVariables;
                    tenantVariablesCopy["formattedAddress"] = vm.state.formattedAddress;
                    tenantVariablesCopy["acceptableDistance"] = vm.state.acceptableDistance;
                    tenantVariablesCopy["longitude"] = results[0].geometry.location.lng();
                    tenantVariablesCopy["latitude"] = results[0].geometry.location.lat();
                    tenantVariablesCopy["locationPermissionsBody"] = vm.state.locationPermissionsBody || "";
                    tenantVariablesCopy["locationPermissionsHeader"] = vm.state.locationPermissionsHeader || "";
                    tenantVariablesCopy["notAcceptableLocationMessage"] = notAcceptableLocationMessage;
                    tenantVariablesCopy["notAcceptableLocationHeader"] = vm.state.notAcceptableLocationHeader || "";
                    tenantVariablesCopy["canPlayOutside"] = canPlayOutside;
                    tenantVariablesCopy["canPlay"] = canPlay;

                    const db = getDatabase();
                    set(ref(db, 'tenantVariables'), tenantVariablesCopy).then(() => {
                        vm.setState({
                            tenantVariables: tenantVariablesCopy,
                            loading: false
                        });
                        Toast.fire({
                            title: 'Updates Successful'
                        });
                    }).catch((error) => {
                        vm.setState({ loading: false });
                        ErrorMessage.fire({
                            title: 'Error',
                            text: error.message
                        });
                    });
                } else {
                    vm.setState({ loading: false });
                    ErrorMessage.fire({
                        title: 'Hold on!',
                        text: "Too many locations have that address! Add more detail to get only 1 address"
                    });
                }
            } else {
                vm.setState({ loading: false });
                ErrorMessage.fire({
                    title: 'Hold on!',
                    text: 'Finding address was not successful because ' + status
                });
            }
        });
    }

    updateList(listToUpdate) {
        const listName = listToUpdate + 'List';
        let listToSave = this.state[listName];
        listToSave = listToSave.trim().toLowerCase();
        let rejoinedCleanedDomainsEmails = "";

        if (listToSave) {
            const splitList = listToSave.split(/[ ,\s]+/);
            for (const splitListIndex in splitList) {
                const splitItem = splitList[splitListIndex];
                let valid;
                if (splitItem.indexOf('@') === -1) {
                    valid = isValidDomain(splitItem);
                } else {
                    valid = validateEmail(splitItem);
                }
                if (!valid) {
                    ErrorMessage.fire({
                        title: 'Hold on!',
                        text: "One of the items on the block list isn't a valid email or domain. The item causing an issue is: " + splitItem + "."
                    });
                    return;
                }
            }
            rejoinedCleanedDomainsEmails = splitList.join(" ");
        }

        const db = getDatabase();
        const updates = {};
        updates[`tenantVariables/${listName}`] = rejoinedCleanedDomainsEmails;

        update(ref(db), updates).then(() => {
            Toast.fire({ title: 'List Updated' });
        }).catch((error) => {
            ErrorMessage.fire({
                title: 'There was some error!',
                text: 'Try again and if the problem persists try logging out and logging back in'
            });
        });
    }

    async handleRichTextChange(name, text) {
        const tenantVariablesCopy = this.state.tenantVariables;
        if (isEmptyHtmlEntity(text)) {
            text = "";
        }
        tenantVariablesCopy[name] = text;
        const updates = {};
        updates[`tenantVariables/${name}`] = text;
        await update(ref(database), updates)
        this.setState({ tenantVariables: tenantVariablesCopy });
    }

    async updateCustomDropdownOptions() {
        const returnedArray = detectHowManyCodesEntered(this.state.customDropdownOptions, false, true);
        const responseToAlert = await WarningMessage.fire({
            title: 'Save Dropdown Options?',
            text: `Are you sure you want to do this? We have detected ${returnedArray.length} potential responses`,
            type: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Save',
        });
        if (responseToAlert.value) {
            const updates = {};
            updates['tenantVariables/customDropdownOptions'] = this.state.customDropdownOptions;
            update(ref(database), updates)
                .then(() => {
                    Toast.fire({title: 'Updated'});
                })
                .catch((error) => {
                    ErrorMessage.fire({
                        title: 'There was some error!',
                        text: 'Try again and if the problem persists try logging out and logging back in',
                        type: 'error',
                        confirmButtonText: 'Ok'
                    });
                });
        }
    }

    render() {
        const variables = this.state.tenantVariables || {};
        const collectName = variables.collectName;
        const nameInEmail = variables.nameInEmail;
        const collectYesNoQuestion = variables.collectYesNoQuestion;
        const collectYesNoQuestion2 = variables.collectYesNoQuestion2;
        const collectYesNoQuestion3 = variables.collectYesNoQuestion3;
        const collectYesExplanation = variables.collectYesExplanation;
        const collectYesExplanation2 = variables.collectYesExplanation2;
        const collectYesExplanation3 = variables.collectYesExplanation3;
        const noMandatoryTermsAndConditions = variables.noMandatoryTermsAndConditions;
        const collectZipCode = variables.collectZipCode;
        const collectOptIn = variables.collectOptIn;
        const collectOptInTwo = variables.collectOptInTwo;
        const collectOptInThree = variables.collectOptInThree;
        const collectOptInFour = variables.collectOptInFour;
        const optInDefaultUnchecked = variables.optInDefaultUnchecked;
        const collectOptInTwoNotDefaultCheck = variables.collectOptInTwoNotDefaultCheck;
        const collectOptInThreeNotDefaultCheck = variables.collectOptInThreeNotDefaultCheck;
        const collectOptInFourNotDefaultCheck = variables.collectOptInFourNotDefaultCheck;
        const collectBirthday = variables.collectBirthday;
        const collectPhoneNumber = variables.collectPhoneNumber;
        const collectCity = variables.collectCity;
        const collectState = variables.collectState;
        const formBirthday = variables.formBirthday;
        const optionalPhoneNumber = variables.optionalPhoneNumber;
        const allowAnonymousLogin = variables.allowAnonymousLogin;
        const collectDistance = variables.collectDistance;
        const collectFullAddress = variables.collectFullAddress;
        const keepFansLoggedIn = variables.keepFansLoggedIn;
        const collectCustomDropdown = variables.collectCustomDropdown;
        const collectCountry = variables.collectCountry;
        const acceptableDistance = parseFloat(this.state.acceptableDistance);
        const doNotVerifyAmericanZipCode = variables.doNotVerifyAmericanZipCode;
        const doNotVerifyAmericanPhoneNumber = variables.doNotVerifyAmericanPhoneNumber;
        const verifyNewZealandPhoneNumber = variables.verifyNewZealandPhoneNumber;
        let formattedAddress = this.state.formattedAddress;
        let locationPermissionsBody = this.state.locationPermissionsBody;
        let locationPermissionsHeader = this.state.locationPermissionsHeader;
        const sanitizeEmails = variables.sanitizeEmails;
        const canPlayOutside = this.state.canPlayOutside;
        const canPlay = this.state.canPlay;
        const notAcceptableLocationMessage = this.state.notAcceptableLocationMessage;
        const notAcceptableLocationHeader = this.state.notAcceptableLocationHeader;
        const allowedZipCodes = variables.allowedZipCodes;
        const blockedZipCodesTextMessage = variables.blockedZipCodesTextMessage;

        return (
            <div className="admin-wrapper">
                <div className="loading-screen" style={{ display: this.state.loading ? 'block' : 'none' }} />
                <SideMenu />
                <TopMenu />
                <div className="admin-main-panel">
                    <div className="container-out container-left-rules" style={{ float: "left", width: "50%" }}>
                        <div className="admin-form-box">
                            <div className="form-group">
                                <label htmlFor="rulesAndRegsText">Collect Name Of Fan</label>
                                <p style={{ fontSize: '10px', color: 'grey', fontFamily: 'Open Sans' }}>Check this box to add a MANDATORY name field to the login flow</p>
                                <input type="checkbox" checked={collectName} id="collectName" name="collectName" onClick={() => this.selectOption("collectName")} />
                            </div>
                            {collectName &&
                                <>
                                    <div className="form-group">
                                        <label htmlFor="rulesAndRegsText">Include Name In Email</label>
                                        <br />
                                        <input type="checkbox" checked={nameInEmail} id="nameInEmail" name="nameInEmail" onClick={() => this.selectOption("nameInEmail")} />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="namePlaceHolderText">Name Placeholder Text</label>
                                        <p style={{ fontSize: '10px', color: 'grey', fontFamily: 'Open Sans' }}>Use this to inform the fans which name to enter</p>
                                        <input value={variables.namePlaceHolderText} className="form-control" type="text" id="namePlaceHolderText" name="namePlaceHolderText" placeholder="First & Last Name" onChange={this.handleTextChange} />
                                    </div>
                                </>
                            }
                            <div className="form-group">
                                <label htmlFor="collectOptIn">Collect ZipCode</label>
                                <p style={{ fontSize: '10px', color: 'grey', fontFamily: 'Open Sans' }}>Check this box to add a MANDATORY zip code field to the login flow</p>
                                <input type="checkbox" checked={collectZipCode} id="collectZipCode" name="collectZipCode" onClick={() => this.selectOption("collectZipCode")} />
                            </div>
                            {collectZipCode &&
                                <>
                                    <div className="form-group">
                                        <label htmlFor="zipCodePlaceholder">Zipcode Placeholder Text</label>
                                        <p style={{ fontSize: '10px', color: 'grey', fontFamily: 'Open Sans' }}>Use this to inform the fans which zip to enter</p>
                                        <input value={variables.zipCodePlaceholder} className="form-control" type="text" id="zipCodePlaceholder" name="zipCodePlaceholder" placeholder="Zipcode" onChange={this.handleTextChange} />
                                    </div>
                                    <div style={{marginTop: 10}}>
                                        <label htmlFor="allowedZipCodes">Allowed Zips:</label>
                                        <br/>
                                        <textarea id="allowedZipCodes" name="allowedZipCodes" value={allowedZipCodes} onChange={this.handleTextChange}/>
                                    </div>
                                    {collectZipCode && allowedZipCodes && allowedZipCodes.length > 0 &&
                                        <div>
                                            <div className="form-group">
                                                <label htmlFor="blockedZipCodesTextHeader">Blocked Zip Header:</label>
                                                <input id="blockedZipCodesTextHeader" name="blockedZipCodesTextHeader" type="text" className="form-control" value={this.state.tenantVariables.blockedZipCodesTextHeader} onChange={this.handleTextChange} placeholder={"Sorry!"}/>
                                            </div>
                                            <div className="form-group">
                                                <label htmlFor="blockedZipCodesTextMessage">Blocked Zip Message:</label>
                                                <RichTextMarkdown
                                                    placeholder="You are outside of the play area"
                                                    form={{ setFieldValue: this.handleRichTextChange }}
                                                    field={{ name: 'blockedZipCodesTextMessage', value: blockedZipCodesTextMessage }}
                                                    handleChange={(newValue) => this.handleRichTextChange("blockedZipCodesTextMessage", newValue)}
                                                />
                                            </div>
                                        </div>
                                    }
                                </>
                            }
                            <div className="form-group">
                                <label htmlFor="collectCity">Collect City</label>
                                <p style={{ fontSize: '10px', color: 'grey', fontFamily: 'Open Sans' }}>Check this box to add a MANDATORY city field to the login flow</p>
                                <input type="checkbox" checked={collectCity} id="collectCity" name="collectCity" onClick={() => this.selectOption("collectCity")} />
                            </div>
                            {collectCity &&
                                <div className="form-group">
                                    <label htmlFor="cityPlaceholder">City Placeholder Text</label>
                                    <p style={{ fontSize: '10px', color: 'grey', fontFamily: 'Open Sans' }}>Use this to inform the fans which city to enter</p>
                                    <input value={variables.cityPlaceholder} className="form-control" type="text" id="cityPlaceholder" name="cityPlaceholder" placeholder="City" onChange={this.handleTextChange} />
                                </div>
                            }
                            <div className="form-group">
                                <label htmlFor="collectState">Collect State</label>
                                <p style={{ fontSize: '10px', color: 'grey', fontFamily: 'Open Sans' }}>Check this box to add a MANDATORY state field to the login flow</p>
                                <input type="checkbox" checked={collectState} id="collectState" name="collectState" onClick={() => this.selectOption("collectState")} />
                            </div>
                            {collectState &&
                                <div className="form-group">
                                    <label htmlFor="statePlaceholder">State Placeholder Text</label>
                                    <p style={{ fontSize: '10px', color: 'grey', fontFamily: 'Open Sans' }}>Use this to inform the fans which state to enter</p>
                                    <input value={variables.statePlaceholder} className="form-control" type="text" id="statePlaceholder" name="statePlaceholder" placeholder="State" onChange={this.handleTextChange} />
                                </div>
                            }
                            <div className="form-group">
                                <label htmlFor="collectFullAddress">Collect Full Address</label>
                                <p style={{ fontSize: '10px', color: 'grey', fontFamily: 'Open Sans' }}>Check this box to add a MANDATORY address field to the login flow</p>
                                <input type="checkbox" checked={collectFullAddress} id="collectFullAddress" name="collectFullAddress" onClick={() => this.selectOption("collectFullAddress")} />
                                <div style={{ display: collectFullAddress ? "" : "none", margin: 5 }}>
                                    <div className="form-group">
                                        <label htmlFor="fullAddressPlaceHolderText">Placeholder Text</label>
                                        <p style={{ fontSize: '10px', color: 'grey', fontFamily: 'Open Sans' }}>Enter the placeholder text you want to appear in the input box</p>
                                        <input placeholder="Mailing Address" type="text" id="fullAddressPlaceHolderText" name="fullAddressPlaceHolderText" className="form-control" value={variables.fullAddressPlaceHolderText} onChange={this.handleTextChange} />
                                    </div>
                                </div>
                            </div>
                            <div className="form-group">
                                <label htmlFor="collectBirthday">Collect Birthday</label>
                                <p style={{ fontSize: '10px', color: 'grey', fontFamily: 'Open Sans' }}>Check this box to add a MANDATORY birthday input field</p>
                                <input type="checkbox" checked={collectBirthday} id="collectBirthday" name="collectBirthday" onClick={() => this.selectOption("collectBirthday")} />
                                <div style={{ display: collectBirthday ? "" : "none", margin: 5 }}>
                                    <div className="form-group" style={{ display: collectBirthday ? "" : "none" }}>
                                        <label htmlFor="allowedAge">Age</label>
                                        <p style={{ fontSize: '10px', color: 'grey', fontFamily: 'Open Sans' }}>Enter an age that the user must be above to play</p>
                                        <input type="number" id="allowedAge" name="allowedAge" className="form-control" value={variables.allowedAge} onChange={this.handleTextChange} />
                                    </div>
                                    <label className="radio-inline" style={{ marginRight: 5 }}>
                                        <input type="radio" name="formBirthday" id="formBirthday" onChange={() => this.selectOption("formBirthday")} checked={formBirthday} /> In Form Birthday Input
                                    </label>
                                    <label className="radio-inline">
                                        <input type="radio" name="formBirthday" id="formBirthday" onChange={() => this.selectOption("formBirthday")} checked={!formBirthday} /> Page Birthday Input
                                    </label>
                                </div>
                            </div>
                            <div className="form-group">
                                <label htmlFor="collectPhoneNumber">Collect Phone Number</label>
                                <p style={{ fontSize: '10px', color: 'grey', fontFamily: 'Open Sans' }}>Check this box to add a MANDATORY phone number field to the login flow</p>
                                <input type="checkbox" checked={collectPhoneNumber} id="collectPhoneNumber" name="collectPhoneNumber" onClick={() => this.selectOption("collectPhoneNumber")} />
                                {collectPhoneNumber &&
                                    <div>
                                        <label className="radio-inline" style={{ marginRight: 5 }}>
                                            <input type="radio" name="optionalPhoneNumber" id="optionalPhoneNumber" onChange={() => this.selectOption("optionalPhoneNumber")} checked={optionalPhoneNumber} /> Optional
                                        </label>
                                        <label className="radio-inline">
                                            <input type="radio" name="optionalPhoneNumber" id="optionalPhoneNumber" onChange={() => this.selectOption("optionalPhoneNumber")} checked={!optionalPhoneNumber} /> Mandatory
                                        </label>
                                    </div>
                                }
                            </div>
                            <div className="form-group">
                                <label htmlFor="collectOptIn">Turn On Optional Opt-In</label>
                                <p style={{ fontSize: '10px', color: 'grey', fontFamily: 'Open Sans' }}>Check this box to add a optional field to the login flow, enter the text below</p>
                                <input type="checkbox" checked={collectOptIn} id="collectOptIn" name="collectOptIn" onClick={() => this.selectOption("collectOptIn")} />
                            </div>
                            {collectOptIn &&
                                <div className="form-group">
                                    <label htmlFor="promotionText">Opt-In Text</label>
                                    <p style={{ fontSize: '10px', color: 'grey', fontFamily: 'Open Sans' }}>Text That Shows Next To Opt-In Check Box</p>
                                    <RichTextMarkdown
                                        field={{
                                            id: "promotionText",
                                            name: "promotionText",
                                            value: this.state.promotionText,
                                        }}
                                        form={{
                                            setFieldValue: (field, value) => this.handleRichTextChange('promotionText', value)
                                        }}
                                        placeholder="Opt in to our sweet offer"
                                    />
                                    <input type="checkbox" checked={optInDefaultUnchecked} id="optInDefaultUnchecked" name="optInDefaultUnchecked" onClick={() => this.selectOption("optInDefaultUnchecked")} style={{ marginRight: 5 }} />
                                    <label htmlFor="optInDefaultUnchecked">Default Opt-In Not Checked</label>
                                </div>
                            }
                            {(collectOptIn || collectOptInTwo) &&
                                <div className="form-group">
                                    <label htmlFor="collectOptInTwo">Collect Second Opt-In</label>
                                    <p style={{ fontSize: '10px', color: 'grey', fontFamily: 'Open Sans' }}>Check this box to add a optional field to the login flow, enter the text below</p>
                                    <input type="checkbox" checked={collectOptInTwo} id="collectOptInTwo" name="collectOptInTwo" onClick={() => this.selectOption("collectOptInTwo")} />
                                </div>
                            }
                            {collectOptInTwo &&
                                <>
                                    <p style={{ fontSize: '10px', color: 'grey', fontFamily: 'Open Sans' }}>Text That Shows Next To Opt-In Check Box</p>
                                    <RichTextMarkdown
                                        field={{
                                            id: "promotionTextTwo",
                                            name: "promotionTextTwo",
                                            value: this.state.promotionTextTwo,
                                        }}
                                        form={{
                                            setFieldValue: (field, value) => this.handleRichTextChange('promotionTextTwo', value)
                                        }}
                                        placeholder="Opt in to our sweet offer"
                                    />
                                    <div className="form-group">
                                        <label htmlFor="collectOptInTwoNotDefaultCheck">Default Not Checked</label>
                                        <p style={{ fontSize: '10px', color: 'grey', fontFamily: 'Open Sans' }}>Check this box to have the Opt-In field not default checked</p>
                                        <input type="checkbox" checked={collectOptInTwoNotDefaultCheck} id="collectOptInTwoNotDefaultCheck" name="collectOptInTwoNotDefaultCheck" onClick={() => this.selectOption("collectOptInTwoNotDefaultCheck")} />
                                    </div>
                                </>
                            }
                            {((collectOptIn && collectOptInTwo) || collectOptInThree) &&
                                <>
                                    <div className="form-group">
                                        <label htmlFor="collectOptInTwo">Collect Third Opt-In</label>
                                        <p style={{ fontSize: '10px', color: 'grey', fontFamily: 'Open Sans' }}>Check this box to add a optional field to the login flow, enter the text below</p>
                                        <input type="checkbox" checked={collectOptInThree} id="collectOptInThree" name="collectOptInThree" onClick={() => this.selectOption("collectOptInThree")} />
                                    </div>
                                    {collectOptInThree &&
                                        <>
                                            <p style={{ fontSize: '10px', color: 'grey', fontFamily: 'Open Sans' }}>Text That Shows Next To Opt-In Check Box</p>
                                            <RichTextMarkdown
                                                field={{
                                                    id: "promotionTextThree",
                                                    name: "promotionTextThree",
                                                    value: this.state.promotionTextThree,
                                                }}
                                                form={{
                                                    setFieldValue: (field, value) => this.handleRichTextChange('promotionTextThree', value)
                                                }}
                                                placeholder="Opt in to our sweet offer"
                                            />
                                            <div className="form-group">
                                                <label htmlFor="collectOptInThreeNotDefaultCheck">Default Not Checked</label>
                                                <p style={{ fontSize: '10px', color: 'grey', fontFamily: 'Open Sans' }}>Check this box to have the Opt-In field not default checked</p>
                                                <input type="checkbox" checked={collectOptInThreeNotDefaultCheck} id="collectOptInThreeNotDefaultCheck" name="collectOptInThreeNotDefaultCheck" onClick={() => this.selectOption("collectOptInThreeNotDefaultCheck")} />
                                            </div>
                                        </>
                                    }
                                </>
                            }
                            {((collectOptIn && collectOptInTwo && collectOptInThree) || collectOptInFour) &&
                                <>
                                    <div className="form-group">
                                        <label htmlFor="collectOptInFour">Collect Fourth Opt-In</label>
                                        <p style={{ fontSize: '10px', color: 'grey', fontFamily: 'Open Sans' }}>Check this box to add a optional field to the login flow, enter the text below</p>
                                        <input type="checkbox" checked={collectOptInFour} id="collectOptInFour" name="collectOptInFour" onClick={() => this.selectOption("collectOptInFour")} />
                                    </div>
                                    {collectOptInFour &&
                                        <>
                                            <p style={{ fontSize: '10px', color: 'grey', fontFamily: 'Open Sans' }}>Text That Shows Next To Opt-In Check Box</p>
                                            <RichTextMarkdown
                                                field={{
                                                    id: "promotionTextFour",
                                                    name: "promotionTextFour",
                                                    value: this.state.promotionTextFour,
                                                }}
                                                form={{
                                                    setFieldValue: (field, value) => this.handleRichTextChange('promotionTextFour', value)
                                                }}
                                                placeholder="Opt in to our sweet offer"
                                            />
                                            <div className="form-group">
                                                <label htmlFor="collectOptInFourNotDefaultCheck">Default Not Checked</label>
                                                <p style={{ fontSize: '10px', color: 'grey', fontFamily: 'Open Sans' }}>Check this box to have the Opt-In field not default checked</p>
                                                <input type="checkbox" checked={collectOptInFourNotDefaultCheck} id="collectOptInFourNotDefaultCheck" name="collectOptInFourNotDefaultCheck" onClick={() => this.selectOption("collectOptInFourNotDefaultCheck")} />
                                            </div>
                                        </>
                                    }
                                </>
                            }
                            <div className="form-group">
                                <label htmlFor="collectCountry">Collect Country</label>
                                <p style={{ fontSize: '10px', color: 'grey', fontFamily: 'Open Sans' }}>Check this box to add a MANDATORY country drop down field to the login flow</p>
                                <input type="checkbox" checked={collectCountry} id="collectCountry" name="collectCountry" onClick={() => this.selectOption("collectCountry")} />
                            </div>
                            <div className="form-group">
                                <label htmlFor="showAdvancedSettings">Advanced</label>
                                <br />
                                <input type="checkbox" checked={this.state.advanced} id="advanced" name="advanced" onChange={this.handleChange} />
                            </div>
                            <div style={{ display: this.state.advanced ? "" : "none" }}>
                                <div className="form-group">
                                    <label htmlFor="collectDistance">Turn On/Off Geolocation</label>
                                    <p style={{ fontSize: '10px', color: 'grey', fontFamily: 'Open Sans' }}>Check this box to add MANDATORY verification of distance from location</p>
                                    <input type="checkbox" checked={collectDistance} id="collectDistance" name="collectDistance" onClick={() => this.selectOption("collectDistance")} />
                                    <span style={{ display: collectDistance ? 'block' : 'none' }}>
                                        If failed location user can <input type="checkbox" onClick={() => this.setState({ canPlay: false })} checked={!canPlay} /> not play <input onClick={() => this.setState({ canPlay: true })} type="checkbox" checked={canPlay} /> play but not win
                                        <br />
                                        <label htmlFor="formattedAddress" style={{ marginTop: 5, marginBottom: 0 }}>Address</label>
                                        <br />
                                        <input className="form-control" type="text" id="formattedAddress" name="formattedAddress" value={formattedAddress} onChange={this.handleChange} placeholder="Address" />
                                        <br />
                                        <label htmlFor="locationPermissionsHeader" style={{ marginTop: 5, marginBottom: 0 }}>Requesting Location Permissions Header</label>
                                        <br />
                                        <input className="form-control" type="text" id="locationPermissionsHeader" name="locationPermissionsHeader" value={locationPermissionsHeader} onChange={this.handleChange} placeholder="Location Permissions Header" />
                                        <br />
                                        <label htmlFor="locationPermissionsBody" style={{ marginTop: 5, marginBottom: 0 }}>Requesting Location Permissions Body</label>
                                        <br />
                                        <textarea className="form-control" id="locationPermissionsBody" name="locationPermissionsBody" value={locationPermissionsBody} onChange={this.handleChange} placeholder="Location Permissions Body" />
                                        <br />
                                        <label htmlFor="notAcceptableLocationHeader" style={{ marginTop: 5, marginBottom: 0 }}>Not Acceptable Location Header</label>
                                        <br />
                                        <input className="form-control" type="text" id="notAcceptableLocationHeader" name="notAcceptableLocationHeader" value={notAcceptableLocationHeader} onChange={this.handleChange} placeholder="Not Acceptable Location Header" />
                                        <br />
                                        <label htmlFor="notAcceptableLocationMessage" style={{ marginTop: 5, marginBottom: 0 }}>Not Acceptable Location Message</label>
                                        <br />
                                        <RichTextMarkdown
                                            field={{
                                                id: "notAcceptableLocationMessage",
                                                name: "notAcceptableLocationMessage",
                                                value: notAcceptableLocationMessage,
                                            }}
                                            form={{
                                                setFieldValue: (field, value) => this.setState({ notAcceptableLocationMessage: value })
                                            }}
                                            placeholder="Not Acceptable Location Message"
                                        />
                                        <br />
                                        <label htmlFor="acceptableDistance" style={{ marginTop: 5, marginBottom: 0 }}>Distance (Miles)</label>
                                        <input type="checkbox" onClick={() => this.setState({ canPlayOutside: false })} checked={!canPlayOutside} /> Fans Can Play Within <input onClick={() => this.setState({ canPlayOutside: true })} type="checkbox" checked={canPlayOutside} /> Fans Can Play Outside
                                        <br />
                                        <input className="form-control" type="number" id="acceptableDistance" step="0.1" name="acceptableDistance" min="0" value={acceptableDistance} onChange={this.handleChange} placeholder="" />
                                        <button className="btn btn-primary btn-lg update-button" style={{ marginTop: 5 }} onClick={() => this.updateDistance()}><span className="fa fa-arrow-circle-o-up" /> Update Distance Variables</button>
                                    </span>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="noMandatoryTermsAndConditions">Turn OFF Mandatory Terms And Conditions</label>
                                    <p style={{ fontSize: '10px', color: 'grey', fontFamily: 'Open Sans' }}>Check this box to remove the MANDATORY confirm rules and regs checkbox<br />Rules and Regs Text and Link come from the <a href="/setuprulesandregs"><u>Rules and Regs Tab</u></a></p>
                                    <input type="checkbox" checked={noMandatoryTermsAndConditions} id="noMandatoryTermsAndConditions" name="noMandatoryTermsAndConditions" onClick={() => this.selectOption("noMandatoryTermsAndConditions")} />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="sanitizeEmails">Sanitize Emails</label>
                                    <p style={{ fontSize: '10px', color: 'grey', fontFamily: 'Open Sans' }}>Check this box to map accounts with the same sanitized email to the same account<br />(could lead to issues with users having the same email address)</p>
                                    <input type="checkbox" checked={sanitizeEmails} id="sanitizeEmails" name="sanitizeEmails" onClick={() => this.selectOption("sanitizeEmails")} />
                                </div>
                                {collectPhoneNumber &&
                                    <div className="form-group">
                                        <label htmlFor="doNotVerifyAmericanPhoneNumber">Do Not Verify American Phone Number?</label>
                                        <p style={{ fontSize: '10px', color: 'grey', fontFamily: 'Open Sans' }}>Do not verify American Phone Number. Check this only if the phone numbers you are collecting are outside the U.S.</p>
                                        <input type="checkbox" checked={doNotVerifyAmericanPhoneNumber} id="doNotVerifyAmericanPhoneNumber" name="doNotVerifyAmericanPhoneNumber" onClick={() => this.selectOption("doNotVerifyAmericanPhoneNumber")} />
                                    </div>
                                }
                                {collectPhoneNumber && doNotVerifyAmericanPhoneNumber &&
                                    <div className="form-group">
                                        <label htmlFor="verifyNewZealandPhoneNumber">Verify New Zealand Phone Number?</label>
                                        <p style={{ fontSize: '10px', color: 'grey', fontFamily: 'Open Sans' }}>Verify New Zealand Phone Number. Check this only if the phone numbers you are collecting are from New Zealand</p>
                                        <input type="checkbox" checked={verifyNewZealandPhoneNumber} id="verifyNewZealandPhoneNumber" name="verifyCanadianZipCode" onClick={() => this.selectOption("verifyNewZealandPhoneNumber")} />
                                    </div>
                                }
                                {collectZipCode &&
                                    <div className="form-group">
                                        <label htmlFor="doNotVerifyAmericanZipCode">Do Not Verify American Zip Code?</label>
                                        <p style={{ fontSize: '10px', color: 'grey', fontFamily: 'Open Sans' }}>Do not verify American Zip Code. Check this only if the zip codes you are collecting are outside the U.S.</p>
                                        <input type="checkbox" checked={doNotVerifyAmericanZipCode} id="doNotVerifyAmericanZipCode" name="doNotVerifyAmericanZipCode" onClick={() => this.selectOption("doNotVerifyAmericanZipCode")} />
                                    </div>
                                }
                                <div className="form-group">
                                    <label htmlFor="blockList">Block List Emails/Domains</label>
                                    <p style={{ fontSize: '10px', color: 'grey', fontFamily: 'Open Sans' }}>Enter any emails or domains that should be blocked from logging in.</p>
                                    <textarea className="form-control" id="blockList" name="blockList" value={this.state.blockList} onChange={this.handleChange} />
                                    <button className="btn btn-primary btn-lg update-button" style={{ marginTop: 5 }} onClick={() => this.updateList('block')}><span className="fa fa-arrow-circle-o-up" /> Update Block List</button>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="allowList">Allow List Emails/Domains</label>
                                    <p style={{ fontSize: '10px', color: 'grey', fontFamily: 'Open Sans' }}>Enter any emails or domains that should be allowed to login, all other emails/domains will be blocked. This will SUPERSEDE any emails/domains on the block list and let them play</p>
                                    <textarea className="form-control" id="allowList" name="allowList" value={this.state.allowList} onChange={this.handleChange} />
                                    <button className="btn btn-primary btn-lg update-button" style={{ marginTop: 5 }} onClick={() => this.updateList('allow')}><span className="fa fa-arrow-circle-o-up" /> Update Allow List</button>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="keepFansLoggedIn">Keep Fans Logged In?</label>
                                    <p style={{ fontSize: '10px', color: 'grey', fontFamily: 'Open Sans' }}>Check this box to keep fans logged in so they will not have to keep filling in the login form</p>
                                    <input type="checkbox" checked={keepFansLoggedIn} id="keepFansLoggedIn" name="keepFansLoggedIn" onClick={() => this.selectOption("keepFansLoggedIn")} />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="collectYesNoQuestion">Collect Yes Or No Question</label>
                                    <p style={{ fontSize: '10px', color: 'grey', fontFamily: 'Open Sans' }}>Check this box to add a Yes No Question To Your Login Form</p>
                                    <input type="checkbox" checked={collectYesNoQuestion} id="collectYesNoQuestion" name="collectYesNoQuestion" onClick={() => this.selectOption("collectYesNoQuestion")} />
                                </div>
                                {collectYesNoQuestion &&
                                    <>
                                        <RichTextMarkdown
                                            field={{
                                                id: "yesNoQuestionText",
                                                name: "yesNoQuestionText",
                                                value: this.state.yesNoQuestionText,
                                            }}
                                            form={{
                                                setFieldValue: (field, value) => this.handleRichTextChange('yesNoQuestionText', value)
                                            }}
                                            placeholder="A great yes or no question"
                                        />
                                        <div className="form-group">
                                            <label htmlFor="collectYesExplanation">Collect Yes Explanation?</label>
                                            <p style={{ fontSize: '10px', color: 'grey', fontFamily: 'Open Sans' }}>Check this box to add a mandatory input for an explanation of why yes</p>
                                            <input type="checkbox" checked={collectYesExplanation} id="collectYesExplanation" name="collectYesExplanation" onClick={() => this.selectOption("collectYesExplanation")} />
                                        </div>
                                        {collectYesExplanation &&
                                            <div className="form-group">
                                                <label htmlFor="yesExplanationPlaceHolderText">Yes Explanation Placeholder Text</label>
                                                <p style={{ fontSize: '10px', color: 'grey', fontFamily: 'Open Sans' }}>Use this to inform the fans to explain why yes</p>
                                                <input value={variables.yesExplanationPlaceHolderText} className="form-control" type="text" id="yesExplanationPlaceHolderText" name="yesExplanationPlaceHolderText" placeholder="Why yes?" onChange={this.handleTextChange} />
                                            </div>
                                        }
                                        <div className="form-group">
                                            <label htmlFor="collectYesNoQuestion2">Collect Second Yes Or No Question</label>
                                            <p style={{ fontSize: '10px', color: 'grey', fontFamily: 'Open Sans' }}>Check this box to add a second Yes No Question To Your Login Form</p>
                                            <input type="checkbox" checked={collectYesNoQuestion2} id="collectYesNoQuestion2" name="collectYesNoQuestion2" onClick={() => this.selectOption("collectYesNoQuestion2")} />
                                        </div>
                                        {collectYesNoQuestion2 &&
                                            <>
                                                <RichTextMarkdown
                                                    field={{
                                                        id: "yesNoQuestionText2",
                                                        name: "yesNoQuestionText2",
                                                        value: this.state.yesNoQuestionText2,
                                                    }}
                                                    form={{
                                                        setFieldValue: (field, value) => this.handleRichTextChange('yesNoQuestionText2', value)
                                                    }}
                                                    placeholder="A great yes or no question"
                                                />
                                                <div className="form-group">
                                                    <label htmlFor="collectYesExplanation2">Collect Yes Explanation?</label>
                                                    <p style={{ fontSize: '10px', color: 'grey', fontFamily: 'Open Sans' }}>Check this box to add a mandatory input for an explanation of why yes</p>
                                                    <input type="checkbox" checked={collectYesExplanation2} id="collectYesExplanation2" name="collectYesExplanation2" onClick={() => this.selectOption("collectYesExplanation2")} />
                                                </div>
                                                {collectYesExplanation2 &&
                                                    <div className="form-group">
                                                        <label htmlFor="yesExplanationPlaceHolderText2">Yes Explanation Placeholder Text</label>
                                                        <p style={{ fontSize: '10px', color: 'grey', fontFamily: 'Open Sans' }}>Use this to inform the fans to explain why yes</p>
                                                        <input value={variables.yesExplanationPlaceHolderText2} className="form-control" type="text" id="yesExplanationPlaceHolderText2" name="yesExplanationPlaceHolderText2" placeholder="Why yes?" onChange={this.handleTextChange} />
                                                    </div>
                                                }
                                            </>
                                        }
                                        <div className="form-group">
                                            <label htmlFor="collectYesNoQuestion3">Collect Third Yes Or No Question</label>
                                            <p style={{ fontSize: '10px', color: 'grey', fontFamily: 'Open Sans' }}>Check this box to add a third Yes No Question To Your Login Form</p>
                                            <input type="checkbox" checked={collectYesNoQuestion3} id="collectYesNoQuestion3" name="collectYesNoQuestion3" onClick={() => this.selectOption("collectYesNoQuestion3")} />
                                        </div>
                                        {collectYesNoQuestion3 &&
                                            <>
                                                <RichTextMarkdown
                                                    field={{
                                                        id: "yesNoQuestionText3",
                                                        name: "yesNoQuestionText3",
                                                        value: this.state.yesNoQuestionText3,
                                                    }}
                                                    form={{
                                                        setFieldValue: (field, value) => this.handleRichTextChange('yesNoQuestionText3', value)
                                                    }}
                                                    placeholder="A great yes or no question"
                                                />
                                                <div className="form-group">
                                                    <label htmlFor="collectYesExplanation3">Collect Yes Explanation?</label>
                                                    <p style={{ fontSize: '10px', color: 'grey', fontFamily: 'Open Sans' }}>Check this box to add a mandatory input for an explanation of why yes</p>
                                                    <input type="checkbox" checked={collectYesExplanation3} id="collectYesExplanation3" name="collectYesExplanation3" onClick={() => this.selectOption("collectYesExplanation3")} />
                                                </div>
                                                {collectYesExplanation3 &&
                                                    <div className="form-group">
                                                        <label htmlFor="yesExplanationPlaceHolderText3">Yes Explanation Placeholder Text</label>
                                                        <p style={{ fontSize: '10px', color: 'grey', fontFamily: 'Open Sans' }}>Use this to inform the fans to explain why yes</p>
                                                        <input value={variables.yesExplanationPlaceHolderText3} className="form-control" type="text" id="yesExplanationPlaceHolderText3" name="yesExplanationPlaceHolderText3" placeholder="Why yes?" onChange={this.handleTextChange} />
                                                    </div>
                                                }
                                            </>
                                        }
                                    </>
                                }
                                <div className="form-group">
                                    <label htmlFor="collectCustomDropdown">Collect Custom Dropdown</label>
                                    <p style={{ fontSize: '10px', color: 'grey', fontFamily: 'Open Sans' }}>Check this box to add custom drop down</p>
                                    <input type="checkbox" checked={collectCustomDropdown} id="collectCustomDropdown" name="collectCustomDropdown" onClick={() => this.selectOption("collectCustomDropdown")} />
                                </div>
                                {collectCustomDropdown &&
                                    <>
                                        <div className="form-group">
                                            <label htmlFor="customDropdownOptions">Custom Dropdown Options</label>
                                            <p style={{ fontSize: '10px', color: 'grey', fontFamily: 'Open Sans' }}>Enter any options you want to show up in the dropdown, separate each option with the same separator. For example separating with a comma, space, or line break</p>
                                            <textarea className="form-control" id="customDropdownOptions" name="customDropdownOptions" value={this.state.customDropdownOptions} onChange={this.handleChange} />
                                            <button className="btn btn-primary btn-lg update-button" style={{ marginTop: 5 }} onClick={() => this.updateCustomDropdownOptions()}><span className="fa fa-arrow-circle-o-up" /> Update Custom Dropdown Options</button>
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="customDropdownPlaceholderText">Custom Dropdown Placeholder Text</label>
                                            <p style={{ fontSize: '10px', color: 'grey', fontFamily: 'Open Sans' }}>This is the text that will show up as the first option in the dropdown but will not count as a value</p>
                                            <input value={variables.customDropdownPlaceholderText} className="form-control" type="text" id="customDropdownPlaceholderText" name="customDropdownPlaceholderText" placeholder="" onChange={this.handleTextChange} />
                                        </div>
                                    </>
                                }
                            </div>
                        </div>
                    </div>
                    <div className="container-out mobile-hide" style={{ width: '45%', float: 'right', marginRight: '20px' }}>
                        <div className="admin-form-box" style={{ border: '1px solid black', backgroundColor: 'white' }}>
                            <p style={{ fontSize: '20px', fontWeight: 'bold' }}>What Data Should I Gather?</p>
                            <p className="text-muted2">Think carefully about what you want to gather from your fan base. The more you ask for, the fewer people will be willing to go through the whole logging in process.
                                Balance that with useful parameters that you can use to help your fans get more value from your experience.</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default SetUpLoginVariables;
