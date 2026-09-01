import { SignJWT } from 'jose';

const apiKey = import.meta.env.VITE_LIVEKIT_API_KEY;
const apiSecret = import.meta.env.VITE_LIVEKIT_API_SECRET;
export const livekitUrl = import.meta.env.VITE_LIVEKIT_URL;

export async function generateToken(roomName, participantName) {
  const secret = new TextEncoder().encode(apiSecret);

    const token = await new SignJWT({
    video: {
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    },
    name: participantName,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(apiKey)
    .setSubject(participantName)
    .setExpirationTime('6h')
    .setNotBefore('0s')
    .sign(secret);

  return token;
}

export async function fetchRoomParticipants(roomName) {
  if (!apiKey || !apiSecret || !livekitUrl) return [];
  
  const url = new URL('/room/' + encodeURIComponent(roomName) + '/participants', livekitUrl);
  
  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': 'Basic ' + btoa(apiKey + ':' + apiSecret),
    },
  });

  if (!response.ok) {
    console.error('Failed to fetch participants:', response.statusText);
    return [];
  }

  const data = await response.json();
  return data.participants || [];
}