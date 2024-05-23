import { asyncRouter } from './async.router';
import * as SwaggerUI from 'swagger-ui-express';

const YAML = require('yamljs');

const router = asyncRouter();

export default router;

const swaggerDocument = YAML.load('./openapi.yaml');
router.use(
  '',
  SwaggerUI.serve,
  SwaggerUI.setup(
    swaggerDocument,
    {
      customSiteTitle: '6529-PreNode API Docs',
      customCss: '.topbar { display: none }'
    },
    { explorer: true }
  )
);
