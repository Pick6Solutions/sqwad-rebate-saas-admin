import React, { Component } from 'react';
import SideMenu from '../admin/SideMenu';
import { Modal, ModalHeader, ModalBody } from 'reactstrap';
import TopMenu from '../admin/TopBar';
//import { database } from '../../base';
import {Toast, ErrorMessage, WarningMessage, validUrl} from '../utils/HelpfulFunction';
import {
    ref,
    onValue,
    push,
    set,
    remove
} from 'firebase/database';
import UploadImage from '../utils/UploadImage';
import '../../styles/css/AdminMain.css';
import BasicDropzone from '../utils/Dropzone';
import ReactPlayer from 'react-player';
import RichTextMarkdown from "../utils/RichTextMarkdown";

class SetUpQuestions extends Component {
    constructor(props) {
        super(props);
        this.UploadImage = new UploadImage();
        this.state = {
            questionsList: [],
            editingTicket: false,
            selectedQuestion: {},
            newAnswerText: '',
            newAnswerImage: null,
            newAnswerImagePreview: {},
            currentAnswerList: [],
            currentQuestionTitle: '',
            rewardToEdit: null,
            imageUrl: null,
            modal: false,
            editTicketId: "",
            loading: true,
            add_image: false,
            add_video: false,
            videoLength: null,
            videoLink: "",
            duplicatingItem: false,
            answerDescription: ''
        };

        this.toggle = this.toggle.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.handleVideoChange = this.handleVideoChange.bind(this);
    }

    componentDidMount() {
        // Listen for changes in 'questionsList' in Realtime Database
        const questionsRef = ref(database, 'questionsList');
        this.unsubscribe = onValue(questionsRef, (snapshot) => {
            const data = snapshot.val();
            // If no data, store empty array
            if (!data) {
                this.setState({ questionsList: [], loading: false });
                return;
            }

            // If your data is saved as an object, convert it to an array
            // so it matches what you had with Rebase's asArray: true.
            // If your DB is *actually* stored as an array, you can adjust accordingly.
            const questionsList = Object.keys(data).map((key) => ({
                key,
                ...data[key],
            }));

            this.setState({ questionsList, loading: false });
        });
    }

    componentWillUnmount() {
        // Clean up the onValue listener
        if (this.unsubscribe) {
            // In Firebase Realtime Database, onValue returns an unsubscribe function
            this.unsubscribe();
        }
    }

    handleChange(evt) {
        const target = evt.target;
        const value = target.type === 'checkbox' ? target.checked : target.value;
        this.setState({ [evt.target.name]: value });
    }

    handleVideoChange(evt) {
        const name_of_file = evt.target.name;
        const target = this[name_of_file];
        const file_to_update = target.files[0];

        this.setState({ loading: true });
        this.UploadImage.upload_file(file_to_update)
            .then(res => {
                this.setState({ loading: false });
                if (res && res.error) {
                    ErrorMessage.fire({
                        title: 'Video cannot be uploaded',
                        text: res.error,
                    });
                } else if (res && res.imageUrl) {
                    this.setState({
                        fileUploaded: true,
                        videoLink: res.imageUrl
                    });
                } else {
                    ErrorMessage.fire({
                        title: 'Video cannot be uploaded',
                        text: "Something went wrong, please re-upload your video and try again!",
                    });
                }
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
        const fileToUpdate = files[0];
        const nameToUpdate = myArgument + "Preview";

        this.setState({
            [nameToUpdate]: {
                fileToUpdate,
                preview: URL.createObjectURL(fileToUpdate)
            }
        });
    }

    async answerToLocalArray() {
        let array = [...this.state.currentAnswerList];
        let newAnswerText = (this.state.newAnswerText || "").trim();
        const newAnswerImage = this.state.newAnswerImagePreview || {};
        const add_image = this.state.add_image || false;
        let answerDescription = this.state.answerDescription;

        if (!newAnswerText) {
            ErrorMessage.fire({
                title: 'Answer is blank',
                text: 'Please enter an answer and try again',
            });
            return;
        }

        if (newAnswerText.length > 72) {
            ErrorMessage.fire({
                title: 'Answer is Too Long',
                text: 'Answer cannot be longer than 72 characters',
            });
            return;
        }

        let imageUrl = null;
        if (add_image && newAnswerImage?.preview) {
            // If the preview is a data URL, we upload
            // or if it's an existing URL, we can skip upload
            if (!validUrl(newAnswerImage.preview)) {
                // Upload the actual file
                this.setState({ loading: true });
                const uploadRes = await this.UploadImage.upload_file(newAnswerImage.fileToUpdate);
                this.setState({ loading: false });

                if (uploadRes && uploadRes.imageUrl) {
                    imageUrl = uploadRes.imageUrl;
                } else {
                    ErrorMessage.fire({
                        title: 'Image cannot be uploaded',
                        text: 'There was some issue with the image upload, please reupload and try again',
                    });
                    return;
                }
            } else {
                // It's already a valid URL
                imageUrl = newAnswerImage.preview;
            }
        }

        const answerId = push(ref(database)).key;

        const newAnswerObject = {
            answerText: newAnswerText,
            id: answerId,
            answerImage: imageUrl,
            answerImagePreview: imageUrl ? imageUrl : null,
            order: array.length + 1,
            answerDescription
        };

        array.push(newAnswerObject);
        this.setState({
            currentAnswerList: array,
            newAnswerText: "",
            newAnswerImagePreview: {},
            loading: false,
            answerDescription: ''
        });
    }

    createQuestion() {
        const {
            currentQuestionTitle,
            selectedQuestion,
            duplicatingItem,
            add_video,
            videoLink,
            videoLength,
        } = this.state;

        let questionTitle = currentQuestionTitle || selectedQuestion?.questionText;
        let answers = [...this.state.currentAnswerList];

        if (duplicatingItem) {
            // Reassign IDs if duplicating so each answer is new
            answers.forEach(answer => {
                answer.id = push(ref(database)).key;
            });
        }

        if (!questionTitle) {
            ErrorMessage.fire({
                title: 'No Prediction',
                text: 'Make sure to fill out the prediction section!',
            });
            return;
        }

        // If user checked "add video", validate the link
        let finalVideoLink = add_video ? videoLink : false;
        let finalVideoLength = add_video ? videoLength : false;

        if (add_video && finalVideoLink && !validUrl(finalVideoLink)) {
            ErrorMessage.fire({
                title: 'Oh uh!',
                text: 'Video link is not a valid URL',
            });
            return;
        } else if (add_video && !finalVideoLink) {
            ErrorMessage.fire({
                title: 'Oh uh!',
                text: 'You indicated you want to add a video but haven\'t added a valid link or file',
            });
            return;
        }

        if (answers.length < 2) {
            ErrorMessage.fire({
                title: 'Incorrect Answers',
                text: 'You need to add at least two answers',
            });
            return;
        }

        answers.forEach(a => (a.answerImagePreview = null));

        const questionData = {
            questionText: questionTitle,
            answers,
            videoLink: finalVideoLink || "",
            videoLength: finalVideoLength || null
        };

        // Create new question
        if (!selectedQuestion || !selectedQuestion.key) {
            // Pushing a brand-new item
            push(ref(database, 'questionsList'), questionData)
                .then(() => {
                    this.setState({
                        selectedQuestion: {},
                        currentAnswerList: [],
                        videoLink: "",
                        videoLength: null,
                        add_video: false,
                        add_image: false,
                        currentQuestionTitle: "",
                        newAnswerText: "",
                        modal: false,
                        duplicatingItem: false
                    });
                })
                .catch((err) => {
                    console.error(err);
                    // handle error
                });
        } else {
            // Editing existing
            set(ref(database, `questionsList/${selectedQuestion.key}`), questionData)
                .then(() => {
                    this.setState({
                        modal: false,
                        selectedQuestion: {},
                        videoLink: "",
                        videoLength: null,
                        add_video: false,
                        add_image: false,
                        currentAnswerList: [],
                        duplicatingItem: false
                    });
                })
                .catch((err) => {
                    console.error(err);
                    // handle error
                });
        }
    }

    editQuestion(event) {
        event.preventDefault();
        const index = event.target.value;
        const question = this.state.questionsList[index];
        if (!question) {
            ErrorMessage.fire({
                title: 'Oh uh!',
                text: 'Something went wrong, refresh the page and try again!',
            });
            return;
        }

        const addVideo = !!question.videoLink;

        this.setState({
            modal: true,
            currentQuestionTitle: question.questionText,
            videoLink: question.videoLink || "",
            add_video: addVideo,
            videoLength: question.videoLength,
            selectedQuestion: question,
            currentAnswerList: [...question.answers],
            duplicatingItem: false
        });
    }

    duplicateQuestion(event) {
        event.preventDefault();
        const index = event.target.value;
        const question = this.state.questionsList[index];
        if (!question) {
            ErrorMessage.fire({
                title: 'Oh uh!',
                text: 'Something went wrong, refresh the page and try again!',
            });
            return;
        }

        const addVideo = !!question.videoLink;

        this.setState({
            modal: true,
            currentQuestionTitle: question.questionText,
            videoLink: question.videoLink || "",
            add_video: addVideo,
            videoLength: question.videoLength,
            currentAnswerList: [...question.answers],
            duplicatingItem: true
        });
    }

    async deleteTicket(e) {
        e.preventDefault();
        const index = e.target.value;
        const question = this.state.questionsList[index];
        if (!question) return;

        const response = await WarningMessage.fire({
            title: 'Delete Prediction?',
            text: 'Are you sure you want to do this?  You will no longer be able to use this prediction in any new games',
            confirmButtonText: 'Delete'
        });
        if (!response || !response.value) return;
        remove(ref(database, `questionsList/${question.key}`))
            .then(() => {
                Toast.fire({
                    title: 'Deleted!'
                });
            })
            .catch(() => {
                ErrorMessage.fire({
                    title: 'There was some error!',
                    text: 'Try again, and if the problem persists, try logging out and back in.',
                });
            });
    }

    toggle() {
        this.setState((prev) => ({
            modal: !prev.modal,
            editingTicket: false,
            selectedQuestion: {},
            currentAnswerList: [],
            currentQuestionTitle: '',
            duplicatingItem: false,
            add_image: false
        }));
    }

    removeFromAnswerArray(index) {
        let answerArray = [...this.state.currentAnswerList];
        answerArray.splice(index, 1);
        // Reorder
        for (let i = 0; i < answerArray.length; i++) {
            answerArray[i].order = i + 1;
        }
        this.setState({ currentAnswerList: answerArray });
    }

    editAnswer(answer, index) {
        // Remove from array, put it into the "add" box
        this.removeFromAnswerArray(index);
        const answerImage = answer.answerImage;
        const answerDescription = answer.answerDescription;
        let add_image = false;
        if(answerImage){
            add_image = true;
        }
        this.setState({
            newAnswerText: answer.answerText,
            newAnswerImagePreview: { preview: answerImage },
            newAnswerImage: null,
            answerDescription,
            add_image
        });
    }

    changeOrder(item, direction) {
        const arr = [...this.state.currentAnswerList];
        const originalOrder = item.order; // 1-based

        // If trying to move up the top item or down the bottom item, ignore
        if ((originalOrder === 1 && direction === 1) ||
            (originalOrder === arr.length && direction === -1)) {
            return;
        }

        // newOrder is the new position
        const newOrder = originalOrder - direction;
        // Swap the one currently occupying newOrder
        const indexA = arr.findIndex(a => a.id === item.id);
        const indexB = arr.findIndex(a => a.order === newOrder);

        if (indexA === -1 || indexB === -1) return;

        // Swap order fields
        arr[indexA].order = newOrder;
        arr[indexB].order = originalOrder;

        this.setState({ currentAnswerList: arr });
    }

    handleRichTextChange = (name, text) => {
        this.setState({ [name]: text });
    }

    render() {
        const {
            loading,
            questionsList,
            currentAnswerList,
            newAnswerImagePreview,
            modal,
            add_video,
            videoLink,
            videoLength,
            answerDescription
        } = this.state;

        return (
            <div className="admin-wrapper">
                {/* Loading Overlay */}
                <div className="loading-screen" style={{ display: loading ? 'block' : 'none' }} />

                <SideMenu />
                <TopMenu />

                <div className="admin-main-panel">
                    <div className="card">
                        <div className="card-body">
                            <p className="admin-header-text" style={{ marginBottom: 0 }}>Predictions</p>
                            <p className="admin-subheader-text">These are predictions fans will respond to during the game</p>
                            <button
                                className="btn btn-primary btn-lg create-prize-button"
                                style={{ fontSize: 20, marginLeft: 20 }}
                                onClick={this.toggle}
                            >
                                Add Prediction
                            </button>

                            <div className="admin-grid-container four-columns" style={{ marginTop: 20 }}>
                                {questionsList.map((item, i) => {
                                    const sortedAnswers = item.answers.sort((a, b) => a.order - b.order);
                                    return (
                                        <div key={i} className="card">
                                            <div className="card-body" align="center">
                                                <p style={{ marginTop: 5 }}>{item.questionText}</p>
                                                <ul style={{ textAlign: "left" }}>
                                                    {sortedAnswers.map((ans, t) => (
                                                        <li key={t} style={{ listStyle: "none" }}>
                                                            - {ans.answerText}
                                                            {ans.answerImage && (
                                                                <img
                                                                    src={ans.answerImage}
                                                                    width="50px"
                                                                    height="50px"
                                                                    alt=""
                                                                    style={{ marginLeft: 5 }}
                                                                />
                                                            )}
                                                        </li>
                                                    ))}
                                                </ul>
                                                <button
                                                    className="btn btn-primary btn-lg edit-button"
                                                    style={{ marginRight: 5, marginBottom: 10 }}
                                                    onClick={this.editQuestion.bind(this)}
                                                    value={i}
                                                >
                                                    <span className="fa fa-ellipsis-v" /> Edit
                                                </button>
                                                <button
                                                    className="btn btn-primary btn-lg delete-button"
                                                    style={{ marginBottom: 10 }}
                                                    onClick={this.deleteTicket.bind(this)}
                                                    value={i}
                                                >
                                                    <span className="fa fa-trash-o" /> Delete
                                                </button>
                                                <div className="row">
                                                    <div className="col-lg-12">
                                                        <button
                                                            className="btn btn-primary btn-lg"
                                                            style={{ marginRight: 5, marginBottom: 10 }}
                                                            onClick={this.duplicateQuestion.bind(this)}
                                                            value={i}
                                                        >
                                                            <span className="fa fa-copy" /> Duplicate
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                <Modal
                    isOpen={modal}
                    toggle={this.toggle}
                    style={{ width: '90%' }}
                    id="myModal"
                >
                    <ModalHeader toggle={this.toggle}>Add Prediction</ModalHeader>
                    <ModalBody>
                        <div className="container-out">
                            <div className="question-box question-form">
                                <div className="form-group">
                                    <label htmlFor="rewardName">Prediction</label>
                                    <textarea
                                        id="currentQuestionTitle"
                                        name="currentQuestionTitle"
                                        className="form-control"
                                        value={this.state.currentQuestionTitle}
                                        onChange={this.handleChange}
                                        placeholder="Who will score the most points in the first quarter?"
                                    />
                                </div>

                                <div className="form-group row mb-3">
                  <span className="col-md-1" style={{ paddingRight: 0, paddingTop: 2 }}>
                    <input
                        id="add_video"
                        name="add_video"
                        type="checkbox"
                        checked={add_video}
                        onChange={this.handleChange}
                    />
                  </span>
                                    <label className="col-md-10 col-form-label" htmlFor="add_video" style={{ padding: 0, margin: 0 }}>
                                        Add Video (Optional)
                                        {add_video && (
                                            <span> -- Recommended: 16:9, 1280x720, &lt; 20MB</span>
                                        )}
                                    </label>
                                </div>

                                {add_video && (
                                    <>
                                        <div className="form-group row" style={{ textAlign: "center", alignItems: "center", display: this.state.fileUploaded ? 'none' : '' }}>
                                            <div className="col-md-6">
                                                <label htmlFor="videoLink">Video Link</label>
                                                <input
                                                    type="url"
                                                    id="videoLink"
                                                    name="videoLink"
                                                    className="form-control"
                                                    value={videoLink}
                                                    onChange={this.handleChange}
                                                    placeholder="https://myvideolink.com"
                                                />
                                            </div>
                                            <div className="col-md-1">
                                                <h2><b>OR</b></h2>
                                            </div>
                                            <div className="col-md-2">
                                                <input
                                                    style={{ display: 'none' }}
                                                    id="raceVideoFile"
                                                    name="raceVideoFile"
                                                    type="file"
                                                    ref={input => { this.raceVideoFile = input; }}
                                                    onChange={this.handleVideoChange}
                                                />
                                                <input
                                                    className='btn btn-primary btn-lg choose-image-button'
                                                    type="button"
                                                    value="Choose Video (MP4)"
                                                    onClick={() => document.getElementById('raceVideoFile').click()}
                                                />
                                            </div>
                                        </div>
                                        <div style={{ width: 300, margin: "auto", textAlign: "center", display: videoLink ? '' : 'none' }}>
                                            Preview
                                            {videoLink && (
                                                <span
                                                    style={{ cursor: "pointer", marginLeft: 10 }}
                                                    onClick={() => this.setState({ videoLink: null, fileUploaded: false }, () => {
                                                        const el = document.getElementById('videoLink');
                                                        if (el) el.value = "";
                                                    })}
                                                >
                          ❌
                        </span>
                                            )}
                                            {add_video && videoLink && !videoLength && (
                                                <p style={{ color: "red" }}>
                                                    Video error: couldn't play or still loading
                                                </p>
                                            )}
                                            <ReactPlayer
                                                style={{ display: videoLink ? '' : 'none' }}
                                                url={videoLink}
                                                onDuration={(d) => this.setState({ videoLength: d })}
                                                onError={() => this.setState({ videoLength: null })}
                                                muted
                                                playing
                                                controls
                                                preload="auto"
                                                width="100%"
                                                height="auto"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* ANSWERS */}
                            <div className="container">
                                <h4>Answer Details</h4>
                                <div className="form-group">
                                    <label htmlFor="companyTitle">Add Answer Text:</label>
                                    <input
                                        id="answerText"
                                        name="newAnswerText"
                                        type="text"
                                        value={this.state.newAnswerText}
                                        onChange={this.handleChange}
                                        className="form-control"
                                        placeholder="The Answer To Your Prediction"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="answerDescription">Add Optional Answer Description: </label>
                                    <RichTextMarkdown
                                        field={{
                                            id: "answerDescription",
                                            name: "answerDescription",
                                            value: answerDescription,
                                        }}
                                        form={{
                                            setFieldValue: (field, value) => this.setState({ answerDescription: value })
                                        }}
                                        placeholder=""
                                    />
                                </div>

                                <div className="form-group row mb-3">
                  <span className="col-md-1" style={{ paddingRight: 0, paddingTop: 2 }}>
                    <input
                        id="add_image"
                        name="add_image"
                        type="checkbox"
                        checked={this.state.add_image}
                        onChange={this.handleChange}
                    />
                  </span>
                                    <label className="col-md-10 col-form-label" style={{ padding: 0, margin: 0 }}>
                                        Add Answer Image (Optional):
                                    </label>
                                    {this.state.add_image && (
                                        <BasicDropzone
                                            onDrop={(acceptedFiles, fileRejections) => this.onDrop(acceptedFiles, fileRejections, "newAnswerImage")}
                                            preview={newAnswerImagePreview.preview}
                                        />
                                    )}
                                </div>

                                <center>
                                    <button
                                        className="btn btn-primary btn-lg"
                                        onClick={() => this.answerToLocalArray()}
                                    >
                                        <span className="fa fa-plus" /> ADD ANSWER
                                    </button>
                                </center>

                                <ol>
                                    {currentAnswerList
                                        .sort((a, b) => a.order - b.order)
                                        .map((item, index) => (
                                            <li key={index} style={{ marginTop: 10 }}>
                                                Answer: {item.answerText}
                                                {item.answerImage && (
                                                    <img
                                                        src={item.answerImage}
                                                        width="50px"
                                                        height="50px"
                                                        alt=""
                                                        style={{ marginLeft: 10 }}
                                                    />
                                                )}
                                                <span style={{ marginLeft: 40 }}>
                          <div style={{ display: "inline-block", marginLeft: 10 }}>
                            {/* Up arrow (decrease order) disabled for first item */}
                              <button
                                  style={{ display: index === 0 ? "none" : "" }}
                                  onClick={() => this.changeOrder(item, 1)}
                              >
                              ⬆
                            </button>
                              {/* Down arrow (increase order) disabled for last item */}
                              <button
                                  style={{ display: index === currentAnswerList.length - 1 ? "none" : "" }}
                                  onClick={() => this.changeOrder(item, -1)}
                              >
                              ⬇
                            </button>
                          </div>
                          <button
                              className="btn btn-primary btn-admin"
                              style={{ marginLeft: 40 }}
                              onClick={() => this.editAnswer(item, index)}
                          >
                            <span className="fa fa-pencil" />
                          </button>
                          <button
                              className="btn btn-danger btn-admin"
                              style={{ float: "right" }}
                              onClick={() => this.removeFromAnswerArray(index)}
                          >
                            <span className="fa fa-trash" />
                          </button>
                        </span>
                                            </li>
                                        ))
                                    }
                                </ol>

                                <div className="form-group text-center">
                                    <button
                                        disabled={add_video && videoLink && !videoLength}
                                        className="btn btn-primary btn-lg submit-button"
                                        onClick={() => this.createQuestion()}
                                    >
                                        Submit Prediction
                                    </button>
                                </div>
                            </div>
                        </div>
                    </ModalBody>
                </Modal>
            </div>
        );
    }
}

export default SetUpQuestions;
