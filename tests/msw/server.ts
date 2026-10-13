/**
 * MSW server shared by all unit tests (Node interceptor).
 */
import { setupServer } from "msw/node";

import { handlers } from "./handlers";

export const server = setupServer(...handlers);
