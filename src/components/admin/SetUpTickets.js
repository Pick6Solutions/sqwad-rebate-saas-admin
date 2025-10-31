import React, { Component } from 'react'
import SideMenu from '../admin/SideMenu';
import { Modal, ModalHeader, ModalBody } from 'reactstrap';
import TopMenu from '../admin/TopBar';
import UploadImage from '../utils/UploadImage';
import { ref, onValue, set, remove, push } from 'firebase/database';
//import { database } from '../../base';
import {Toast, ErrorMessage, WarningMessage} from '../utils/HelpfulFunction';
import '../../styles/css/AdminMain.css';
import BasicDropzone from '../utils/Dropzone';
import RichTextMarkdown from "../utils/RichTextMarkdown";
import ColorPicker from "../utils/ColorPicker";

class SetUpTickets extends Component {
    constructor(props) {
        super(props);
        this.UploadImage = new UploadImage();
        this.state = {
            ticketList: [],
            editingTicket: false,
            rewardToEdit: null,
            imageUrl: null,
            modal: false,
            emailImage: null,
            rewardName: "",
            rewardsList: [],
            rewardLink: "",
            rewardLinkButtonText: "",
            colorToShow: "#ffffff",
            colorToUpdate: "",
            colorPickerShow: false,
            colorsTab: true,
            rewardDescription: '',
            editTicketId: "",
            editTicketEmailImage: '',
            emailImagePreview: {},
            loading:true,
            files: []
        };
        this.handleSubmit = this.handleSubmit.bind(this);
        this.toggle = this.toggle.bind(this);
        this.handleChange = this.handleChange.bind(this);
    }

    componentDidMount() {
        const rewardsListRef = ref(database, 'rewardsList');
        onValue(rewardsListRef, (snapshot) => {
            const data = snapshot.val() || {};
            const rewardsList = Object.keys(data).map(key => ({ ...data[key], key }));
            this.setState({ rewardsList, loading: false });
        });
    }

    onDrop(files, rejected, myArgument) {
        if (rejected.length > 0) {
            ErrorMessage.fire({
                title: 'Image cannot be uploaded',
                text: 'Make sure the image is less than 2mbs and it is an accepted file type'
            });
            return;
        }
        this.setState({ loading: true });

        this.UploadImage.upload_file(files[0]).then(res => {
            this.setState({ loading: false });
            if (res.error) {
                ErrorMessage.fire({
                    title: 'Image cannot be uploaded',
                    text: res.error,
                });
            } else if (res.imageUrl) {
                const nameToUpdate = myArgument + "Preview";
                const fileToUpdate = files[0];
                this.setState({
                    [myArgument]: res.imageUrl,
                    [nameToUpdate]: ({
                        fileToUpdate,
                        preview: URL.createObjectURL(fileToUpdate)
                    })
                });
            } else {
                ErrorMessage.fire({
                    title: 'Image cannot be uploaded',
                    text: 'Something went wrong, please re-upload your image and try again!'
                });
            }
        });
    }

    onChangeDescription = (rewardDescription) => {
        this.setState({ rewardDescription });
    }

    componentWillUnmount() {
      // Make sure to revoke the data uris to avoid memory leaks
      URL.revokeObjectURL(this.state.emailImagePreview.preview);
    }

    handleChange(evt){
        let target = evt.target;
        let value = target.type === 'checkbox' ? target.checked : target.value;
        this.setState({ [evt.target.name]: value });
    }

    handleSubmit(event) {
        event.preventDefault();
        if(this.state.loading){
            return
        }

        const rewardName = this.state.rewardName || "";
        const rewardDisplayName = this.state.rewardDisplayName || "";
        const uniquePrizeToggle = this.state.uniquePrizeToggle || false;
        const rewardLink = this.state.rewardLink || "";
        const rewardLinkButtonText = this.state.rewardLinkButtonText || "";
        const rewardLinkButtonTextColor = this.state.rewardLinkButtonTextColor || "";
        const rewardLinkButtonColor = this.state.rewardLinkButtonColor || "";
        let rewardDescription = this.state.rewardDescription;
        const emailImage = this.state.emailImage || this.state.editTicketEmailImage || "";
        if (!rewardName) {
            ErrorMessage.fire({
                title: 'Missing Info',
                text: 'Please enter a name'
            });
            return;
        }
        const rewardToSave = {};
        const rewardId = (this.state.rewardToEdit && this.state.rewardToEdit.key) || push(ref(database, 'rewardsList')).key;
        rewardToSave['rewardName'] = rewardName;
        rewardToSave['rewardDisplayName'] = rewardDisplayName;
        rewardToSave['emailImage'] = emailImage;
        rewardToSave['rewardLink'] = rewardLink;
        rewardToSave['id'] = rewardId;
        rewardToSave['rewardLinkButtonText'] = rewardLinkButtonText;
        rewardToSave['rewardLinkButtonTextColor'] = rewardLinkButtonTextColor;
        rewardToSave['rewardLinkButtonColor'] = rewardLinkButtonColor;
        rewardToSave['uniquePrizeToggle'] = uniquePrizeToggle;
        rewardToSave['description'] = rewardDescription;
        this.setState({loading:true})
        const vm = this;
        set(ref(database, `rewardsList/${rewardToSave.id}`), rewardToSave)
            .then(() => {
                Toast.fire({
                    title: vm.state.rewardToEdit ? 'Successfully Edited!' : 'Successfully Created!'
                });
                vm.setState({
                    rewardDescription: '',
                    fileEmailImage: null,
                    rewardName: "",
                    rewardDisplayName: "",
                    emailImage: null,
                    rewardLink: "",
                    rewardLinkButtonText: "",
                    rewardLinkButtonTextColor: "",
                    rewardLinkButtonColor: "",
                    rewardEmailName: "",
                    rewardToEdit: null,
                    emailImagePreview: {},
                    editingTicket: false,
                    showButton: false,
                    modal: false,
                    loading: false,
                    isRedeemable: false,
                    expiresAtHours: "",
                    expiresAtDateTime: "",
                    templateText: "",
                    vendorName: "",
                    uniquePrizeToggle: false
                });
            })
            .catch((error) => {
                console.error("Error updating document: ", error);
                vm.setState({ loading: false });
                ErrorMessage.fire({
                    title: 'There was some error!',
                    text: 'Try again and if the problem persists try logging out and logging back in'
                });
            });
    }

    editTicket(event){
      event.preventDefault();
      const array = this.state.rewardsList;
      const reward = array[event.target.value];
      this.setState({
        modal: true,
        rewardName: reward.rewardName,
        rewardDisplayName: reward.rewardDisplayName,
        rewardLink: reward.rewardLink,
        rewardDescription: reward.description,
        rewardLinkButtonText: reward.rewardLinkButtonText,
        rewardLinkButtonColor: reward.rewardLinkButtonColor,
        rewardLinkButtonTextColor: reward.rewardLinkButtonTextColor,
        editTicketEmailImage:reward.emailImage,
        rewardEmailName: reward.rewardEmailName,
        showButton: reward.showButton,
        isRedeemable: reward.isRedeemable,
        uniquePrizeToggle: reward.uniquePrizeToggle,
        rewardToEdit: reward,
        editingTicket: true,
        expiresAtHours: reward.expiresAtHours,
        expiresAtDateTime: reward.expiresAtDateTime,
        vendorName: reward.vendorName,
        templateText: reward.templateText
      });
    }

    async deleteTicket(e) {
        e.preventDefault();
        const array = this.state.rewardsList;
        const index = array[e.target.value];
        const response = await WarningMessage.fire({
            title: 'Delete Prize?',
            text: 'Are you sure you want to do this?  You will no longer be able to use this prize in any new games',
            confirmButtonText: 'Delete'
        });
        if (response.value) {
            remove(ref(database, 'rewardsList/' + index.key)).catch(err => {
                ErrorMessage.fire({
                    title: 'There was some error!',
                    text: 'Try again and if the problem persists try logging out and logging back in',
                });
            });
        }
    }

    toggle() {
      this.setState({
          modal: !this.state.modal,
          rewardName: "",
          rewardLink: "",
          rewardDescription: '',
          rewardLinkButtonText: "",
          rewardLinkButtonColor: "",
          rewardLinkButtonTextColor: "",
          editTicketEmailImage:null,
          rewardToEdit: null,
          editingTicket: false,
          uniquePrizeToggle: false,
          showButton: false,
          isRedeemable: false,
          templateText: "",
          vendorName: "",
          rewardEmailName: "",
          expiresAtHours: "",
          expiresAtDateTime: "",
      });
    }

    render() {
        const winningTicketList = this.state.rewardsList;
        const emailImagePreview = this.state.emailImagePreview;

        return (
          <div className="admin-wrapper">
            <div className="loading-screen" style={{display: this.state.loading ? 'block' : 'none' }}/>
            <SideMenu/>
            <TopMenu/>
            <div className="admin-main-panel">
              <div className="card">
                <div className="card-body">
                    <p className="admin-header-text" style={{marginBottom:0}}>Prizes</p>
                    <p className="admin-subheader-text">These are prizes fans will receive when they win Prediction</p>
                    <button className="btn btn-primary btn-lg create-prize-button" style={{fontSize:20,marginLeft:20}} onClick={this.toggle}>Add Prize</button>
                    <div className="admin-grid-container four-columns" style={{marginTop:20}}>
                      {
                        winningTicketList.map(function(item,i){
                          return <div key={i} className="card">
                              <div className="card-body" align="center">
                                <p style={{marginTop:5}}>{item.rewardName}</p>
                                <p>
                                  <img width="80%" height="auto" src={item.emailImage} alt=""/>
                                </p>
                                <button className="btn btn-primary btn-lg edit-button" style={{ marginRight:5, marginBottom:10}} onClick={this.editTicket.bind(this)} value={i}><span className="fa fa-ellipsis-v"/> Edit</button>
                                <button className="btn btn-primary btn-lg delete-button" style={{marginBottom:10}} onClick={this.deleteTicket.bind(this)} value={i}><span className="fa fa-trash-o"/> Delete</button>
                              </div>
                            </div>
                        }, this)
                      }
                    </div>
                  </div>
                </div>
              </div>
            <Modal isOpen={this.state.modal} toggle={this.toggle} style={{width: '90%'}} id="myModal">
              <ModalHeader toggle={this.toggle}>Add Prize</ModalHeader>
                <ModalBody>
                  <div className="container-out">
                    <div className="question-box" style={{border: 'none'}}>
                      <form className="pl-3 pr-3" onSubmit={this.handleSubmit} id="create-email-form">
                        <div className="form-group" >
                          <label htmlFor="rewardName">Prize Name (Only On The Admin)</label>
                          <input id="rewardName" name="rewardName" type="text" className="form-control" value={this.state.rewardName} onChange={this.handleChange} placeholder="My Sweet Prize"/>
                        </div>
                        <div className="form-group" >
                              <label htmlFor="rewardDisplayName">Prize Display Name (Optional)</label>
                              <input id="rewardDisplayName" name="rewardDisplayName" type="text" className="form-control" value={this.state.rewardDisplayName} onChange={this.handleChange} placeholder="My Sweet Prize" />
                        </div>
                        <div className="form-group">
                          <label htmlFor="rewardLink">{!this.state.uniquePrizeToggle && "Prize Link (Optional) OR "}
                            Unique Prize Links <input type="checkbox" checked={this.state.uniquePrizeToggle} id="uniquePrizeToggle" name="uniquePrizeToggle" onChange={this.handleChange}/>
                          </label>
                            {!this.state.uniquePrizeToggle &&
                                <input id="rewardLink" name="rewardLink" type="url" className="form-control" value={this.state.rewardLink} onChange={this.handleChange} placeholder="https://my_sweet_prize_link.com"/>
                            }
                        </div>
                          {(this.state.rewardLink || this.state.uniquePrizeToggle) &&
                          <>
                              <div className="form-group">
                                  <label htmlFor="rewardLinkButtonText">Prize Link Button Text (Optional)</label>
                                  <input id="rewardLinkButtonText" name="rewardLinkButtonText" type="text" className="form-control" value={this.state.rewardLinkButtonText} onChange={this.handleChange} placeholder="Reward Link"/>
                              </div>
                              <div className="row">
                                  <div className="col-md-6">
                                      <ColorPicker
                                          name="rewardLinkButtonTextColor"
                                          label="Button Text Color"
                                          value={this.state.rewardLinkButtonTextColor}
                                          onChange={hex =>
                                              this.handleChange({
                                                  target: { name: 'rewardLinkButtonTextColor', value: hex }
                                              })
                                          }
                                      />
                                  </div>
                                  <div className="col-md-6">
                                      <ColorPicker
                                          name="rewardLinkButtonColor"
                                          label="Button Color"
                                          value={this.state.rewardLinkButtonColor}
                                          onChange={hex =>
                                              this.handleChange({
                                                  target: { name: 'rewardLinkButtonColor', value: hex }
                                              })
                                          }
                                      />
                                  </div>
                              </div>
                          </>
                          }
                          <div className="form-group">
                              <RichTextMarkdown
                                  field={{
                                      id: "rewardDescription",
                                      name: "rewardDescription",
                                      value: this.state.rewardDescription
                                  }}
                                  form={{
                                      setFieldValue: (field, value) => this.onChangeDescription(value)
                                  }}
                                  label="Prize Description"
                                  sublabel="Describe the prize that the user will receive."
                                  placeholder="My Sweet Prize Description"
                              />
                          </div>
                        <div className="form-group" align="center">
                          <label htmlFor="rewardEmailImage" style={{width:'100%'}}>
                              Prize Email Image
                              <span style={{cursor:"pointer", display: emailImagePreview.preview || this.state.editTicketEmailImage?"":"none"}} onClick={()=>this.setState({editTicketEmailImage: null, fileUploaded:false, emailImagePreview: {}, emailImage:null})}>
                                  ❌
                              </span>
                          </label>
                          <img src={this.state.editTicketEmailImage} width="auto" height="100px" style={{display: this.state.editingTicket ? '' : 'none' }} alt=""/>
                            <BasicDropzone
                                onDrop={(acceptedFiles, fileRejections) => this.onDrop(acceptedFiles, fileRejections, "emailImage")}
                                preview={emailImagePreview.preview}
                            />
                        </div>
                        <div className="form-group text-center">
                          <button className="btn btn-primary btn-lg submit-button" id="submitButton">Submit</button>
                        </div>
                      </form>
                    </div>
                  </div>
                </ModalBody>
            </Modal>
         </div>
        );
    }
}

export default SetUpTickets
