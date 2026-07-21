import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { CategoryPage } from './pages/CategoryPage';
import { DetailsPage } from './pages/DetailsPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { SearchPage } from './pages/SearchPage';
import { WatchPage } from './pages/WatchPage';
import { SignUpPage } from './pages/SignUpPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ProfilePage } from './pages/ProfilePage';

export default function App(){ return <Routes><Route element={<Layout/>}><Route path="/" element={<HomePage/>}/><Route path="/category/:type" element={<CategoryPage/>}/><Route path="/search" element={<SearchPage/>}/><Route path="/title/:id" element={<DetailsPage/>}/><Route path="/watch/:id" element={<WatchPage/>}/><Route path="/login" element={<LoginPage/>}/><Route path="/signup" element={<SignUpPage/>}/><Route path="/forgot-password" element={<ForgotPasswordPage/>}/><Route path="/profile" element={<ProfilePage/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Route></Routes> }
