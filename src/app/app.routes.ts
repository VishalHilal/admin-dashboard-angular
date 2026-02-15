import { Routes } from '@angular/router';
import {Dashboard} from './pages/dashboard/dashboard';
import {Login} from './pages/login/login';
import {Signup} from './pages/signup/signup';

export const routes: Routes = [
	{path:'', component:Dashboard},
	{path:'login', component:Login},
	{path:'signup', component:Signup}

];
