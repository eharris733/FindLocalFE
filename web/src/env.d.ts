/// <reference types="astro/client" />

import type { City } from '@findlocal/shared';

declare global {
  namespace App {
    interface Locals {
      /** City resolved from the `fl_city` cookie (default Boston); set by middleware. */
      city: City;
      /** ExecutionContext exposed by @astrojs/cloudflare (undefined under `astro dev`). */
      cfContext?: { waitUntil(p: Promise<unknown>): void };
    }
  }
}
