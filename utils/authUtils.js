export default function basicAuthDecoder(auth) {
  const credentials = auth.split(' ')[1];
  const decodedCredentials = Buffer.from(credentials, 'base64').toString(
    'utf8',
  );
  return decodedCredentials.split(':');
}
