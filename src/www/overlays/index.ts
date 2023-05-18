import Express, {Router} from 'express';
import path from 'path';
import sass from 'node-sass-middleware';

export const overlayRouter: Router = Express.Router();

// Serve up the basic HTML & compiled JS/SCSS
overlayRouter.use(Express.static(path.join(__dirname, 'public')));

if (process.env.NODE_ENV && process.env.NODE_ENV === 'development') {
  overlayRouter.use(
    // Used to convert our scss to css on the fly
    sass({
      src: __dirname,
      response: true,
      debug: true,
    }),
  );
}
