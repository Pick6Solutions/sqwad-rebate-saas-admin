import React, { Component } from 'react';
import SideMenu from '../admin/SideMenu';
import TopMenu from '../admin/TopBar';
//import { database } from '../../base';
import '../../styles/css/AdminMain.css';
import RichTextMarkdown from "../utils/RichTextMarkdown";
import {isObjectEmpty, Toast, ErrorMessage} from '../utils/HelpfulFunction';
import { ref, onValue, set } from 'firebase/database';

class SetUpRulesAndRegs extends Component {
    constructor(props) {
        super(props);
        this.state = {
            rulesAndRegsText: "",
            howToPlayText: "",
            rulesPopUpText: "",
            rulesShowInAppPopUpText: "",
            supportText: "",
            rulesPopUpHeader: "",
            rulesShowInAppPopUpHeader: "",
            rulesInAppButtonText: "",
            howToPlayLink: "",
            tenantRules: null,
            loading: true
        };
        this.handleSubmit = this.handleSubmit.bind(this);
        this.handleChange = this.handleChange.bind(this);
    }

    componentDidMount() {
        const tenantRulesRef = ref(database, 'tenantRules');
        onValue(tenantRulesRef, (snapshot) => {
            const data = snapshot.val() || {};
            this.setState({
                rulesAndRegsText: data.rulesAndRegsText,
                secondaryMandatoryCheckboxText: data.secondaryMandatoryCheckboxText,
                didNotCheckRulesAndRegsBody2: data.didNotCheckRulesAndRegsBody2,
                howToPlayText: data.howToPlayText,
                rulesPopUpText: data.rulesPopUpText,
                rulesShowInAppPopUpText: data.rulesShowInAppPopUpText,
                supportText: data.supportText,
                rulesPopUpHeader: data.rulesPopUpHeader || "",
                didNotCheckRulesAndRegsHeader2: data.didNotCheckRulesAndRegsHeader2 || "",
                rulesShowInAppPopUpHeader: data.rulesShowInAppPopUpHeader || "",
                rulesInAppButtonText: data.rulesInAppButtonText || "",
                howToPlayLink: data.howToPlayLink || "",
                rulesShowInApp: data.rulesShowInApp || false,
                turnOnSecondMandatoryCheckbox: data.turnOnSecondMandatoryCheckbox || false,
                advanced: !!data.rulesShowInApp || !!data.howToPlayText || !!data.rulesPopUpText,
                supportHeader: data.supportHeader || "",
                loading: false
            });
        });
    }

    handleChange(evt) {
        let target = evt.target;
        let value = target.type === 'checkbox' ? target.checked : target.value;
        this.setState({ [target.name]: value });
    }

    handleRichTextChange = (name, text) => {
        this.setState({ [name]: text });
    }

    handleSubmit(event) {
        event.preventDefault();
        let rulesAndRegsText = this.state.rulesAndRegsText || '';
        let rulesPopUpHeader = this.state.rulesPopUpHeader;
        let supportHeader = this.state.supportHeader || "";
        let supportText = this.state.supportText || "";
        let howToPlayLink = this.state.howToPlayLink;
        let rulesPopUpText = this.state.rulesPopUpText || '';
        let howToPlayText = this.state.howToPlayText || '';
        let didNotCheckRulesAndRegsHeader2 = this.state.didNotCheckRulesAndRegsHeader2 || '';
        let didNotCheckRulesAndRegsBody2 = this.state.didNotCheckRulesAndRegsBody2 || "";
        let secondaryMandatoryCheckboxText = this.state.secondaryMandatoryCheckboxText || "";
        let turnOnSecondMandatoryCheckbox = this.state.turnOnSecondMandatoryCheckbox || false;
        let rulesShowInAppPopUpText = this.state.rulesShowInAppPopUpText || '';
        let rulesShowInAppPopUpHeader = this.state.rulesShowInAppPopUpHeader;
        let rulesInAppButtonText = this.state.rulesInAppButtonText;
        if(rulesInAppButtonText && rulesInAppButtonText.length > 18){
            ErrorMessage.fire({
                title: "Input Error",
                text: "Button Text Cannot Be Longer Then 18 Characters",
            });
            return;
        }
        let rulesShowInApp = this.state.rulesShowInApp || false;
        let updateRulesObject = {
            "rulesAndRegsText": rulesAndRegsText, "howToPlayLink": howToPlayLink,
            "howToPlayText": howToPlayText, "rulesPopUpText": rulesPopUpText, "rulesPopUpHeader":rulesPopUpHeader,
            "rulesShowInAppPopUpText": rulesShowInAppPopUpText, "rulesShowInAppPopUpHeader": rulesShowInAppPopUpHeader,
            "rulesInAppButtonText": rulesInAppButtonText, "rulesShowInApp": rulesShowInApp, "supportText": supportText,
            "supportHeader": supportHeader, secondaryMandatoryCheckboxText, didNotCheckRulesAndRegsBody2,
            didNotCheckRulesAndRegsHeader2, turnOnSecondMandatoryCheckbox
        }

        this.setState({ loading: true });

        set(ref(database, 'tenantRules'), updateRulesObject)
            .then(() => {
                this.setState({ loading: false });
                Toast.fire({
                    icon: 'success',
                    title: 'Rules and Regs Updated!'
                });
            })
            .catch((error) => {
                console.error("Error updating document: ", error);
                this.setState({ loading: false });
                ErrorMessage.fire({
                    title: 'There was some error!',
                    text: 'Try again and if the problem persists try logging out and logging back in',
                });
            });
    }

    render() {
        let {
            rulesAndRegsText,
            secondaryMandatoryCheckboxText,
            didNotCheckRulesAndRegsBody2,
            turnOnSecondMandatoryCheckbox,
            didNotCheckRulesAndRegsHeader2,
            rulesPopUpHeader,
            rulesPopUpText,
            rulesInAppButtonText,
            rulesShowInAppPopUpHeader,
            rulesShowInAppPopUpText,
            howToPlayLink,
            howToPlayText,
            supportHeader,
            supportText,
            loading,
            advanced,
            rulesShowInApp
        } = this.state;

        if(isObjectEmpty(rulesPopUpText)){
            rulesPopUpText = ""
        }
        if(isObjectEmpty(rulesAndRegsText)){
            rulesAndRegsText = ""
        }
        if(isObjectEmpty(secondaryMandatoryCheckboxText)){
            secondaryMandatoryCheckboxText = ""
        }
        if(isObjectEmpty(didNotCheckRulesAndRegsBody2)){
            didNotCheckRulesAndRegsBody2 = ""
        }
        if(isObjectEmpty(howToPlayLink)){
            howToPlayLink = ""
        }
        if(isObjectEmpty(rulesPopUpHeader)){
            rulesPopUpHeader = ""
        }
        if(isObjectEmpty(rulesShowInAppPopUpHeader)){
            rulesShowInAppPopUpHeader = ""
        }
        if(isObjectEmpty(rulesShowInAppPopUpText)){
            rulesShowInAppPopUpText = ""
        }
        if(isObjectEmpty(rulesInAppButtonText)){
            rulesInAppButtonText = ""
        }
        if(isObjectEmpty(supportHeader)){
            supportHeader = ""
        }

        const isMlbApp = process.env.REACT_APP_IS_MLB_TEAM === "true";

        return (
            <div className="admin-wrapper">
                <div className="loading-screen" style={{ display: loading ? 'block' : 'none' }} />
                <SideMenu />
                <TopMenu />
                <div className="admin-main-panel">
                    <div className="container-out" style={{ width: '45%', float: 'left' }}>
                        <div className="admin-form-box">
                            <form onSubmit={this.handleSubmit} id="create-game-form">
                                <button className="btn btn-primary btn-lg update-button" id="submitButton" style={{ marginBottom: '20px' }}>
                                    <span className="fa fa-arrow-circle-o-up" /> Update
                                </button>
                                <div className="form-group">
                                    <label htmlFor="rulesAndRegsText">Rules And Regs Text</label>
                                    <p style={{ fontSize: '10px', color: 'grey', fontFamily: 'Open Sans' }}>
                                        This text will appear AFTER the mandatory confirm rules and regs button on the login form
                                        <br />
                                        <strong>Example:</strong> Welcome to Spin To Win! To play, please confirm that you agree with the rules and regs
                                    </p>
                                    <RichTextMarkdown
                                        field={{
                                            id: "rulesAndRegsText",
                                            name: "rulesAndRegsText",
                                            value: rulesAndRegsText
                                        }}
                                        form={{
                                            setFieldValue: (field, value) => this.handleRichTextChange('rulesAndRegsText', value)
                                        }}
                                        placeholder="Enter rules and regulations"
                                    />
                                </div>
                                {!isMlbApp &&
                                    <div className="form-group">
                                        <label htmlFor="showAdvancedSettings">Advanced</label>
                                        <br />
                                        <input type="checkbox" checked={advanced} id="advanced" name="advanced" onChange={this.handleChange} />
                                    </div>
                                }
                                {advanced &&
                                    <>
                                        {!isMlbApp &&
                                            <>
                                                <div className="form-group">
                                                    <label htmlFor="howToPlayLink">How To Play Link</label>
                                                    <p className="text-muted2" style={{ fontSize: '10px' }}>This is where you can teach fans how to play</p>
                                                    <input id="howToPlayLink" name="howToPlayLink" type="url" className="form-control" value={howToPlayLink} onChange={this.handleChange} placeholder="https://ourgameplay.com" />
                                                </div>
                                                <div className="form-group">
                                                    <label htmlFor="howToPlayText">How To Play Text (replaces link if filled)</label>
                                                    <p className="text-muted2" style={{ fontSize: '10px' }}>This is where you can teach fans how to play</p>
                                                    <RichTextMarkdown
                                                        field={{
                                                            id: "howToPlayText",
                                                            name: "howToPlayText",
                                                            value: howToPlayText
                                                        }}
                                                        form={{
                                                            setFieldValue: (field, value) => this.handleRichTextChange('howToPlayText', value)
                                                        }}
                                                        placeholder="Enter how to play text"
                                                    />
                                                </div>
                                            </>
                                        }
                                        {!isMlbApp &&
                                            <div className="form-group">
                                                <label htmlFor="rulesShowInApp">Show Rules And Regs After Sign Up Screen</label>
                                                <br />
                                                <input type="checkbox" checked={rulesShowInApp} id="rulesShowInApp" name="rulesShowInApp" onChange={this.handleChange} />
                                            </div>
                                        }
                                        {rulesShowInApp &&
                                            <>
                                                <div className="form-group">
                                                    <label htmlFor="rulesInAppButtonText">Button Text</label>
                                                    <p className="text-muted2" style={{ fontSize: '10px' }}>The text of the button that links to Rules & Regs</p>
                                                    <input id="rulesInAppButtonText" name="rulesInAppButtonText" type="text" className="form-control" value={rulesInAppButtonText} onChange={this.handleChange} placeholder="Rules & Regs" />
                                                </div>
                                                <div className="form-group">
                                                    <label htmlFor="rulesShowInAppPopUpHeader">Pop Up After Sign Up (Optional)</label>
                                                    <p className="text-muted2" style={{ fontSize: '10px' }}>The header of the in-app pop up</p>
                                                    <input id="rulesShowInAppPopUpHeader" name="rulesShowInAppPopUpHeader" type="text" className="form-control" value={rulesShowInAppPopUpHeader} onChange={this.handleChange} placeholder="Rules & Regs" />
                                                </div>
                                                <div className="form-group">
                                                    <label htmlFor="rulesShowInAppPopUpText">Rules & Regs Pop Up Text</label>
                                                    <p className="text-muted2" style={{ fontSize: '10px' }}>The body text of the pop up</p>
                                                    <RichTextMarkdown
                                                        field={{
                                                            id: "rulesShowInAppPopUpText",
                                                            name: "rulesShowInAppPopUpText",
                                                            value: rulesShowInAppPopUpText
                                                        }}
                                                        form={{
                                                            setFieldValue: (field, value) => this.handleRichTextChange('rulesShowInAppPopUpText', value)
                                                        }}
                                                        placeholder="Enter pop up text"
                                                    />
                                                </div>
                                            </>
                                        }
                                        <div className="form-group">
                                            <label htmlFor="rulesPopUpHeader">Rules & Regs Pop Up Header (Optional)</label>
                                            <p className="text-muted2" style={{ fontSize: '10px' }}>The header of the in-app pop up containing rules</p>
                                            <input id="rulesPopUpHeader" name="rulesPopUpHeader" type="text" className="form-control" value={rulesPopUpHeader} onChange={this.handleChange} placeholder="Rules & Regs" />
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="rulesPopUpText">Rules & Regs Pop Up Text</label>
                                            <p className="text-muted2" style={{ fontSize: '10px' }}>The text of the in-app pop up. When this is filled in it will replace the rules and regs link and the text here will show up in a pop up.</p>
                                            <RichTextMarkdown
                                                field={{
                                                    id: "rulesPopUpText",
                                                    name: "rulesPopUpText",
                                                    value: rulesPopUpText
                                                }}
                                                form={{
                                                    setFieldValue: (field, value) => this.handleRichTextChange('rulesPopUpText', value)
                                                }}
                                                placeholder="Enter pop up text"
                                            />
                                        </div>
                                        {isMlbApp &&
                                            <>
                                                <div className="form-group">
                                                    <label htmlFor="supportHeader">Support Header</label>
                                                    <p className="text-muted2" style={{ fontSize: '10px' }}>The header of the in-app pop up containing support information</p>
                                                    <input id="supportHeader" name="supportHeader" type="text" className="form-control" value={supportHeader} onChange={this.handleChange} placeholder="NEED SUPPORT?" />
                                                </div>
                                                <div className="form-group">
                                                    <RichTextMarkdown
                                                        field={{
                                                            id: "supportText",
                                                            name: "supportText",
                                                            value: supportText
                                                        }}
                                                        form={{
                                                            setFieldValue: (field, value) => this.handleRichTextChange('supportText', value)
                                                        }}
                                                        placeholder="Enter support text"
                                                    />
                                                </div>
                                            </>
                                        }
                                        {!isMlbApp &&
                                            <div className="form-group">
                                                <label htmlFor="turnOnSecondMandatoryCheckbox">Second Mandatory Rules & Regs Checkbox</label>
                                                <br/>
                                                <input type="checkbox" checked={turnOnSecondMandatoryCheckbox} id="turnOnSecondMandatoryCheckbox" name="turnOnSecondMandatoryCheckbox" onChange={this.handleChange}/>
                                            </div>
                                        }
                                        {turnOnSecondMandatoryCheckbox &&
                                            <>
                                                <div className="form-group">
                                                    <label htmlFor="secondaryMandatoryCheckboxText">Rules And Regs Text</label>
                                                    <p style={{fontSize:'10px',color:'grey', fontFamily:'Open Sans'}}>This text will appear AFTER the second mandatory confirm rules and regs button on the login form<br/><strong>Example:</strong> Welcome! To play, please confirm that you agree with the second rules and regs</p>
                                                    <RichTextMarkdown
                                                        placeholder=""
                                                        form={{ setFieldValue: (field, value) =>  this.handleRichTextChange('secondaryMandatoryCheckboxText', value) }}
                                                        field={{
                                                            id: "secondaryMandatoryCheckboxText",
                                                            name: "secondaryMandatoryCheckboxText",
                                                            value: secondaryMandatoryCheckboxText
                                                        }}
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label htmlFor="didNotCheckRulesAndRegsHeader2">Did Not Check Rules And Regs Header</label>
                                                    <p className="text-muted2" style={{fontSize:'10px'}}>The header of the error when the Rules & Regs checkbox isn't error</p>
                                                    <input id="didNotCheckRulesAndRegsHeader2" name="didNotCheckRulesAndRegsHeader2" type="text" className="form-control" value={didNotCheckRulesAndRegsHeader2} onChange={this.handleChange} placeholder="Input Error"/>
                                                </div>
                                                <div className="form-group">
                                                    <label htmlFor="didNotCheckRulesAndRegsBody2">Did Not Check Rules And Regs Body</label>
                                                    <p style={{fontSize:'10px',color:'grey', fontFamily:'Open Sans'}}>This is the body message of the pop up</p>
                                                    <RichTextMarkdown
                                                        placeholder=""
                                                        form={{ setFieldValue: (field, value) =>  this.handleRichTextChange('didNotCheckRulesAndRegsBody2', value) }}
                                                        field={{
                                                            id: "didNotCheckRulesAndRegsBody2",
                                                            name: "didNotCheckRulesAndRegsBody2",
                                                            value: didNotCheckRulesAndRegsBody2
                                                        }}
                                                    />
                                                </div>
                                            </>
                                        }
                                    </>
                                }
                            </form>
                        </div>
                    </div>
                    <div className="container-out" style={{ width: '45%', float: 'right', marginRight: '20px' }}>
                        <div className="admin-form-box" style={{ border: '1px solid black', backgroundColor: 'white' }}>
                            <p style={{ fontSize: '20px', fontWeight: 'bold' }}>Why do I need rules & regulations?</p>
                            <p className="text-muted2">While each state, country, and province is different, you will want to make sure you are compliant with all contest rules and laws. It is your responsibility to update, maintain, & host your rules and regulations tab.</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default SetUpRulesAndRegs;
