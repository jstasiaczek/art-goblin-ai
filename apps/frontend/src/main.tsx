import ReactDOM from 'react-dom/client';
import { Root } from './components/Root/Root';
import { App } from './components/App/App';
import './main.css';

ReactDOM.createRoot(document.getElementById('root')!).render(<Root>
    <App />
</Root>);