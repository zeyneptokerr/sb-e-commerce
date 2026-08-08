import './App.css'
import Home from './components/home/Home';
import Products from './components/products/Products'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/shared/Navbar';
import About from './components/About';
import Contact from './components/Contact';

function App() {

  return (
    <div>
      <Router>
        <Navbar />
        <Routes>
          <Route path="/products" element={<Products />} />
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/cart" element={<h1>Cart</h1>} />
        </Routes>
      </Router>
    </div>
  )
}

export default App
