import './App.css'
import Home from './components/home/Home';
import Products from './components/products/Products'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/shared/Navbar';
import About from './components/About';
import Contact from './components/Contact';
import { Toaster } from 'react-hot-toast';
import React from 'react';
import Cart from './components/cart/Cart';

function App() {

  return (
    <div>
      <React.Fragment>
        <Router>
          <Navbar />
          <Routes>
            <Route path="/products" element={<Products />} />
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/cart" element={<Cart/>} />
          </Routes>
        </Router>
        <Toaster position="bottom-center"/>
      </React.Fragment>
    </div>
  )
}

export default App
