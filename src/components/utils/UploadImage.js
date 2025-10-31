export default class UploadImage {
  async upload_file(file) {
    const formData = new FormData();
    formData.append('file', file);
    if(file && (file.type === "image/png" || file.type === "image/jpeg" || file.type === "image/jpg" || file.type === "image/webp")){
      if( file.size > 2200000 ){
        return {error:"File too big: max size is 2 MB"};
      }
    } else if(file && file.type === "video/mp4") {
      if( file.size > 22000000 ) {
        return {error:"File too big: max size is 20 MB"};
      }
    } else {
      return {error: "Wrong file type"};
    }

    try {
      const response = await fetch('https://nodeimageuploader.herokuapp.com/image_upload', {
        method: 'POST',
        body: formData,
        // headers is removed as fetch will set it properly for formData
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const text = await response.text()
      console.log(text)

      // Check if there's an error key in the response
      if(text){
        return {imageUrl: text};
      } else {
        return {};
      }
    } catch (error) {
      return {error: error.message}; // if you want to return the error message
    }
  }
}
