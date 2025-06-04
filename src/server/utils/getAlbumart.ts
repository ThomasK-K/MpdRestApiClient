var debug = require("debug")("getAlbum");
type songMetadata = {
  images:string[]
  albumname: string
  wiki?:string
}


const loadImage = async (artist, song):Promise<songMetadata|null> => {
  let api_key = process.env.LASTFM_APIKEY;
  try {
    let songData:songMetadata={images:[],albumname:''}

    // use Last FM API to get album art and metadata
    let result = await fetch(
      `${process.env.AUDIOSCROBBLER||'http://ws.audioscrobbler.com/2.0'}/?method=track.getinfo&api_key=${api_key}&artist=${artist}&track=${song}&format=json`
    );
    let data = await result.json();
  
    if (data.error) {
      debug('Fehler beim Scrobblen. Error:', data.error)
      return null
    }
    if(data.track.album && data.track.artist){
        const {album,artist,wiki}= data.track
      songData.albumname = album.title
      songData.wiki = wiki
        
        debug('####### lastfm #######', album.title,artist)
        if (album.image) {
          let imageSource: string[] = album.image;
          let images: string[]=[]
      
          imageSource.forEach((value, idx) => {
            songData.images.push(value['#text'])
          });
          
        }
      // songData.images.push(images)
      return songData;
    } else {
      return null
    }
  } catch (err) {
    throw new Error(err);
  }
};
export default loadImage;
