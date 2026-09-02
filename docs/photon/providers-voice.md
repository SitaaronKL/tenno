# Voice provider (SIP on iMessage lines)

Source: /docs/spectrum-ts/providers/voice/outbound-calls, inbound-calls, troubleshooting

Voice connects a SIP application to an iMessage line owned by a Spectrum project. SDK call control is on the roadmap; today calls go directly over SIP. WhatsApp numbers cannot be used for Spectrum Voice. UDP signaling is never supported; use TLS (preferred) or TCP.

## Outbound calls

SIP account or trunk settings:

| SIP setting | Value |
| --- | --- |
| Server, proxy, or host | `sip.spectrum.photon.codes` |
| Server port | `5061` (TLS) or `5060` (TCP) |
| Transport | TLS (TCP supported for existing integrations, unencrypted) |
| Username | Spectrum project id |
| Password | Spectrum project secret |
| Registration | Off (Spectrum is not a SIP registrar; credentials authenticate each call) |
| Caller ID / From number | An iMessage line owned by the project, E.164 |

Full URI forms: `sips:sip.spectrum.photon.codes:5061` or `sip:sip.spectrum.photon.codes:5060;transport=tcp`. Keep TLS certificate verification on. Softphones that require successful registration are incompatible; use trunk, peer, or no registration mode. A 403 on call setup means the From number is missing or owned by another project. Business profile registration in the dashboard is optional but recommended (1 to 2 business days, free); unregistered outbound calls may be flagged.

## Inbound calls

Inbound routing must be registered in the dashboard; outbound credentials do not create it. Choose the iMessage line, then enter the SIP URI Spectrum should call: `sips:agent@voice.example.com:5061` (TLS) or `sip:...:5060` (TCP), the `agent@` part optional, port defaults 5061 for sips and 5060 for sip but any port works. Optional dashboard Username and Password fields are for SIP Digest auth on incoming calls only. Your endpoint needs a public hostname or IP, an open SIP port, a valid TLS certificate for the URI host when using sips, and open UDP RTP ports (SIP TLS protects signaling only, audio is RTP).

Two registrations, distinct purposes: the inbound route (required for inbound calls) and the business profile (optional, reduces outbound flagging). Neither creates the other.

## Troubleshooting

- Choppy AI audio toward the caller: Spectrum uses G.711 (PCMU/8000 or PCMA/8000); check the codec in your endpoint's 200 OK. Standard telephone quality is expected, not HD.
- One way or missing audio: RTP flows directly between carrier and your endpoint. Accept inbound RTP from carrier media IPs, and behind NAT advertise a public address in the SDP.
- No inbound call: verify the route is saved for the exact line called, and that the endpoint is running, publicly reachable, and listening on the saved transport and port.
- When reporting: project id, SIP Call-ID or call time plus numbers, direction, negotiated codec, and downstream vendor, to help@photon.codes.
