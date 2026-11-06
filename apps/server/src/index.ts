import { app } from "./app";
import { env } from "./env";
import { MAX_REQUEST_BODY_BYTES } from "./modules/products/products.photo";

// Bun refuses a bigger body (413) before it is buffered: the biggest one a route takes is a product photo.
app.listen({ port: env.PORT, maxRequestBodySize: MAX_REQUEST_BODY_BYTES });

console.log(`Server running at ${app.server?.url}`);
if (!env.photos) {
	console.warn("Product photos are off: set R2_* and PHOTOS_PUBLIC_URL.");
}
