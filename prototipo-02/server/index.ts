import { createAssistantServer } from './app.ts';
const server = createAssistantServer();
server.listen(5181, '127.0.0.1', () => console.log('Assistente vocale locale: http://127.0.0.1:5181'));
