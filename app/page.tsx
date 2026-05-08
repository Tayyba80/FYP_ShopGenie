'use client';
import { useState } from 'react';
import ChatInterface from '../components/ChatInterface';
import ResultDisplay from '../components/ResultsDisplay';
import { ChatResponse } from '../types';

import { motion } from "framer-motion";
import Link from "next/link";
import { Sparkles, ShoppingBag, TrendingUp, Zap } from "lucide-react";
import { Button } from "../components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50"
      >
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="size-8 text-purple-600" />
            </motion.div>
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              ShopGenie
            </span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-gradient-to-r from-purple-600 to-blue-600">
                Get Started
              </Button>
            </Link>
          </nav>
        </div>
      </motion.header>

      {/* Hero Section */}
      <div className="container mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-center max-w-4xl mx-auto"
        >
          <motion.h1
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-6xl font-bold mb-6 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 bg-clip-text text-transparent"
          >
            Your AI Shopping Assistant
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="text-xl text-gray-600 mb-8"
          >
            ShopGenie aggregates product information from all major e-commerce
            platforms and uses AI to help you find the perfect product at the
            best price.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="flex gap-4 justify-center"
          >
            <Link href="/signup">
              <Button size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 text-lg px-8">
                Start Shopping Smarter
              </Button>
            </Link>
            <Link href="/chat">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Try Demo
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="grid md:grid-cols-3 gap-8 mt-20"
        >
          {[
            {
              icon: ShoppingBag,
              title: "Multi-Source Aggregation",
              description:
                "We collect data from Amazon, eBay, Walmart, and 100+ retailers",
            },
            {
              icon: TrendingUp,
              title: "Smart Comparisons",
              description:
                "AI-powered analysis of features, prices, and reviews",
            },
            {
              icon: Zap,
              title: "Instant Results",
              description:
                "Get personalized recommendations in seconds",
            },
          ].map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.2 + index * 0.2 }}
              whileHover={{ scale: 1.05, y: -10 }}
              className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100"
            >
              <div className="bg-gradient-to-br from-purple-100 to-blue-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                <feature.icon className="size-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
