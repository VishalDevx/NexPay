import { Router, Request, Response } from "express";
import swaggerUi from "swagger-ui-express";
import { generateOpenApiSpec } from "../../openapi";

const router = Router();

const spec = generateOpenApiSpec();

router.get("/openapi.json", (_req: Request, res: Response) => {
  res.json(spec);
});

router.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(spec, {
    customSiteTitle: "NexPay API Reference",
    customCss: ".swagger-ui .topbar { display: none }",
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
    },
  })
);

export default router;
