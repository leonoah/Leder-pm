import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { initDb } from './lib/db'

initDb()
createRoot(document.getElementById('root')).render(<App />)
