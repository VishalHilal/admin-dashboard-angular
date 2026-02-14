import { Routes } from '@angular/router';
import {Dashboard} from './pages/dashboard/dashboard';
import {Login} from './pages/login/login'

export const routes: Routes = [
	{path:'', component:Dashboard},
	{path:'login', component:Login}

];
