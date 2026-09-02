# WhatsApp Business provider

Source: /docs/spectrum-ts/providers/whatsapp-business/setup, /docs/spectrum-ts/providers/whatsapp-business/conversations

## Config

```ts
import { whatsappBusiness } from "spectrum-ts/providers/whatsapp-business";

whatsappBusiness.config({
  accessToken: "your-access-token",
  phoneNumberId: "your-phone-number-id",
  appSecret: "your-app-secret",
});
```

| Option | Description | Env fallback |
| --- | --- | --- |
| `accessToken` | Permanent or system user token from Meta for Developers | `SPECTRUM_WHATSAPP_BUSINESS_ACCESS_TOKEN` |
| `phoneNumberId` | Phone number id for the sending business account | `SPECTRUM_WHATSAPP_BUSINESS_PHONE_NUMBER_ID` |
| `appSecret` | App secret used to verify webhook payload signatures | `SPECTRUM_WHATSAPP_BUSINESS_APP_SECRET` |

Setting both `SPECTRUM_WHATSAPP_BUSINESS_ACCESS_TOKEN` and `..._PHONE_NUMBER_ID` lets `whatsappBusiness.config()` with no args boot in direct mode from the environment. A partial set falls back to cloud mode using project credentials.

## Line discovery in cloud mode

Cloud mode discovers every line owned by the project from the credentials it mints, re-minted on a schedule. A line added or removed mid run is picked up at the next token renewal, not immediately; until then a new line receives no inbound messages. Restart the process to apply immediately.

## Conversations

1:1 only. Group creation is rejected explicitly (`space.create()` with more than one user throws). Resolve users by phone number in international format, digits only:

```ts
const wa = whatsappBusiness(app);
const customer = await wa.user("15551234567");
const space = await wa.space.create(customer);
```

The management API also exposes WhatsApp Business template CRUD under `/projects/{projectId}/whatsapp-business/accounts/{accountId}/templates/` and account listing under `/projects/{projectId}/whatsapp-business/accounts` (see api-reference.md).
