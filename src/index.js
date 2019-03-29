import initWebScene from './MainScene';

const scene = process.env.REACT_APP_SCENE;

document.body.style.margin = '0';

switch (scene) {
  case 'main':
    initWebScene();
    break;
  case 'test': {
    break;
  }
  default:
    initWebScene();
}
