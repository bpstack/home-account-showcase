import { continueRender, delayRender } from 'remotion'

// The CSS in global.css declares Ubuntu; this makes sure every weight the video uses is
// downloaded before the first frame, not only the ones the first frame happens to show.
const FACES = [
  '300 16px Ubuntu',
  '400 16px Ubuntu',
  '500 16px Ubuntu',
  '700 16px Ubuntu',
  '400 16px "Ubuntu Mono"',
  '700 16px "Ubuntu Mono"',
]

const handle = delayRender('Loading Ubuntu')

Promise.all(FACES.map((face) => document.fonts.load(face)))
  .then(() => document.fonts.ready)
  .finally(() => continueRender(handle))
