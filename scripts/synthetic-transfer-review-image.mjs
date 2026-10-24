// Generated fictional one-pixel raster; contains no receipt or bank information.
const dataUrl="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4AWL6z/D/PwAAAP//d1qrsQAAAAZJREFUAwAHCAMADotRrAAAAABJRU5ErkJggg==";
export const syntheticTransferReviewImage=()=>({dataUrl,fileName:'FICTIONAL.png',mimeType:'image/png',bytes:Buffer.from(dataUrl.split(',')[1],'base64').length});
export const syntheticTransferReviewFields=()=>{const image=syntheticTransferReviewImage();return{image_data_url:image.dataUrl,file_name:image.fileName,mime_type:image.mimeType,byte_size:image.bytes};};
