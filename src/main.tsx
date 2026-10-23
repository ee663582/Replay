import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './style.css'
import './tweak.css'
import './design.css'
import './type-tune.css'
import './site-polish.css'
import './mcp-demo.css'

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)
