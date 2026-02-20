import { Composition } from 'remotion'
import { Video } from './Video'
import './global.css'

export const Root: React.FC = () => {
  return (
    <Composition
      id="HomeAccountPromo"
      component={Video}
      durationInFrames={3600}
      fps={30}
      width={1920}
      height={1080}
    />
  )
}
