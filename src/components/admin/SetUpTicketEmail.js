import React, { Component } from 'react'
import SideMenu from '../admin/SideMenu';
import TopMenu from '../admin/TopBar';
import UploadImage from '../utils/UploadImage';
import { ref, onValue, update, remove } from 'firebase/database';
//import { database } from '../../base';
import '../../styles/css/AdminMain.css';
import {ErrorMessage, Toast, validateEmail, WarningMessage} from '../utils/HelpfulFunction';
import RichTextMarkdown from "../utils/RichTextMarkdown";
import swal from "sweetalert2";

class SetUpTicketEmail extends Component {
    constructor(props) {
        super(props);
        this.UploadImage = new UploadImage();
        this.state = {
            emailVariables: '',
            loading:true,
        };
        this.handleSubmit = this.handleSubmit.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.handleImageChange = this.handleImageChange.bind(this);
    }

    componentWillUnmount() {
        if (this.emailVariablesRef) {
            remove(this.emailVariablesRef);
        }
    }

    componentDidMount() {
        const emailVariablesRef = ref(database, 'emailVariables');
        onValue(emailVariablesRef, (snapshot) => {
            const data = snapshot.val() || {};
            let advanced = false;
            if (data && data.sender) {
                advanced = true;
            }
            this.setState({
                loading: false,
                advanced: advanced,
                emailVariables: data
            });
        }, (error) => {
            this.setState({
                loading: false
            });
        });
        this.emailVariablesRef = emailVariablesRef;
    }

    handleChange(event){
        let target = event.target;
        let value = target.value;
        if(target.type === 'checkbox'){
            value = target.checked;
            this.setState({[target.name]: value})
        } else {
            let emailVariablesCopy = this.state.emailVariables;
            emailVariablesCopy[event.target.name] = value
            this.setState({ emailVariables:  emailVariablesCopy});
        }
    }

    handleImageChange(event) {
        const name_of_file = event.target.name;
        const target = this[name_of_file];
        const file_to_update = target.files[0];
        this.setState({ loading: true });
        const vm = this;
        this.UploadImage.upload_file(file_to_update).then(res => {
            vm.setState({ loading: false });
            if (res.error) {
                ErrorMessage.fire({
                    title: 'Image cannot be uploaded',
                    text: res.error
                });
            } else if (res.imageUrl) {
                let emailVariablesCopy = vm.state.emailVariables;
                emailVariablesCopy[name_of_file] = res.imageUrl;
                vm.setState({
                    emailVariables: emailVariablesCopy,
                }, () => {
                    vm[name_of_file].value = "";
                });
            } else {
                ErrorMessage.fire({
                    title: 'Image cannot be uploaded',
                    text: "Something went wrong, please re-upload your image and try again!"
                });
            }
        });
    }

    handleRichTextChange = (name, text) => {
        let emailVariablesCopy = this.state.emailVariables;
        emailVariablesCopy[name] = text;
        this.setState({ emailVariables:  emailVariablesCopy});
    }

    handleSubmit(event) {
        event.preventDefault();
        const emailVariables = this.state.emailVariables;
        let sender = emailVariables.sender || "";
        if (sender && !validateEmail(sender)) {
            ErrorMessage.fire({
                title: 'Invalid Sender Email!',
                text: 'Please make sure the sender contains a valid email address.',
            });
            return;
        }
        let subjectLine = emailVariables.subjectLine || "";
        let preview = emailVariables.preview || "";
        let replyTo = emailVariables.replyTo || "";
        if (replyTo && !validateEmail(replyTo)) {
            ErrorMessage.fire({
                title: 'Invalid Reply Email!',
                text: 'Please make sure the reply to email contains a valid email address.',
            });
            return;
        }
        let helpText = emailVariables.helpText || "";
        let backgroundImage = emailVariables.emailBackgroundImage || "";
        this.setState({loading:true});
        const updateRulesObject = {};
        updateRulesObject['helpText'] = helpText;
        updateRulesObject['subjectLine'] = subjectLine;
        updateRulesObject['emailBackgroundImage'] = backgroundImage;
        updateRulesObject['sender'] = sender;
        updateRulesObject['replyTo'] = replyTo;
        updateRulesObject['preview'] = preview;
        const vm = this;
        update(ref(database, 'emailVariables'), updateRulesObject).then(() => {
            vm.setState({ loading: false });
            Toast.fire({
                title: 'Email Variables Updated!'
            });
        }).catch(err => {
            vm.setState({ loading: false });
            ErrorMessage.fire({
                title: 'There was some error!',
                text: 'Try again and if the problem persists try logging out and logging back in'
            });
        });
    }

    render() {
        let sender = this.state.emailVariables.sender || "";
        let subjectLine = this.state.emailVariables.subjectLine || "";
        let preview = this.state.emailVariables.preview || "";
        let replyTo = this.state.emailVariables.replyTo || "";
        let helpText = this.state.emailVariables.helpText || "";
        let emailBackgroundImage = this.state.emailVariables.emailBackgroundImage;
        return (
            <div className="admin-wrapper">
                <div className="loading-screen" style={{display: this.state.loading ? 'block' : 'none' }}/>
                <SideMenu/>
                <TopMenu/>
                <div className="admin-main-panel">
                    <p className="admin-header-text" style={{marginBottom:0}}>Email Branding</p>
                    <p className="admin-subheader-text">This is where you can edit the email sent to fans</p>
                    <div className="container-out">
                        <div className="admin-form-box">
                            <form onSubmit={this.handleSubmit} id="create-email-form">
                                <button className="btn btn-primary btn-lg update-button" id="submitButton" style={{marginBottom:20}}><span className="fa fa-arrow-circle-o-up"/> Update</button>
                                <div className="row col-md-12">
                                    <div className="form-group">
                                        <label htmlFor="subjectLine">Email Subject Line</label>
                                        <p style={{fontSize:'10px',color:'grey', fontFamily:'Open Sans'}}>This is the subject line that your fans will see when they receive their winning emails</p>
                                        <input id="subjectLine" name="subjectLine" className="form-control" value={subjectLine} onChange={this.handleChange} />
                                    </div>
                                </div>
                                <div className="row col-md-12">
                                    <div className="form-group">
                                        <label htmlFor="preview">Email Preview Text</label>
                                        <p style={{ fontSize: '10px', color: 'grey', fontFamily: 'Open Sans' }}>This is the preview text for the email, if left blank it will be replaced by the subject line. For mobile optimization the length should be between 35-50 characters but for desktop the preview can be up to 140 characters and beyond</p>
                                        <input id="preview" name="preview" className="form-control" value={preview} onChange={this.handleChange} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="replyTo">Reply To</label>
                                    <p style={{fontSize:'10px',color:'grey', fontFamily:'Open Sans'}}>This is the reply address your fans will see when they reply to the prize email. We recommend a support email or something where you can help your fans with the prize they win</p>
                                    <input id="replyTo" name="replyTo" type="text" className="form-control" value={replyTo} onChange={this.handleChange} />
                                </div>
                                <div className="row">
                                    <div className="form-group col-md-3">
                                        <label htmlFor="helpText">Help Text</label>
                                        <p style={{fontSize:'10px',color:'grey', fontFamily:'Open Sans'}}>This is where you can tell fans where to contact you with issues.  (Example: Having issues? Email info@prediction.com for help.)</p>
                                        <RichTextMarkdown
                                            field={{
                                                id: "helpText",
                                                name: "helpText",
                                                value: helpText
                                            }}
                                            form={{
                                                setFieldValue: (field, value) => this.handleRichTextChange(field, value)
                                            }}
                                        />
                                    </div>
                                    <div className="form-group col-md-9" align="center">
                                        <img src={emailBackgroundImage} width="auto" height="100px" alt=""/>
                                        <br/>
                                        <label htmlFor="backgroundImage">Email Header Image<br/></label>
                                        <div className="form-group">
                                            <input style={{display:'none'}}  id="emailBackgroundImage" name="emailBackgroundImage" type="file" ref={input => {this.emailBackgroundImage = input; }} onChange={this.handleImageChange}/>
                                            <input className='btn btn-primary btn-lg choose-image-button' type="button" value="Choose Image" onClick={() => document.getElementById('emailBackgroundImage').click()} />
                                        </div>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="showAdvancedSettings">Advanced</label>
                                    <br/>
                                    <input type="checkbox" checked={this.state.advanced} id="advanced" name="advanced" onChange={this.handleChange}/>
                                </div>
                                {this.state.advanced &&
                                    <div className="form-group">
                                        <label htmlFor="sender">Email Sender</label>
                                        <p style={{fontSize:'10px',color:'grey', fontFamily:'Open Sans'}}>This is the sender your fans will see when they receive their winning emails. BE AWARE: changing the sender could adversely impact delivery rates</p>
                                        <input id="sender" name="sender" type="text" className="form-control" value={sender} onChange={this.handleChange} />
                                    </div>
                                }
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default SetUpTicketEmail
