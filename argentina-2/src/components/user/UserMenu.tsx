import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth, User } from '@/contexts/AuthContext';
import { LogOut, Settings, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { User as UserIcon } from 'lucide-react';

interface UserMenuProps {
  user: User;
}

export const UserMenu: React.FC<UserMenuProps> = ({ user }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const handleAdminPanel = () => {
    navigate('/admin');
  };

  const handleProfile = () => {
    navigate('/perfil');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:ring-2 hover:ring-orange-500/20 transition-all">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="gradient-orange text-white font-semibold text-sm">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-2">
            <p className="text-sm font-semibold leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs leading-none text-muted-foreground">
                Depto: {user.departmentNumber}
              </p>
              {user.isAdmin && (
                <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 rounded-full">
                  <Shield className="h-3 w-3" />
                  <span className="text-xs font-medium">Admin</span>
                </div>
              )}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleProfile} className="cursor-pointer">
          <UserIcon className="mr-2 h-4 w-4" />
          <span>Mi Perfil</span>
        </DropdownMenuItem>
        
        (user?.isAdmin || user?.subCuenta === "si") && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleAdminPanel} className="cursor-pointer bg-orange-50 hover:bg-orange-100 text-orange-700">
              <Settings className="mr-2 h-4 w-4" />
              <span className="font-medium">Panel de Administración</span>
            </DropdownMenuItem>
          </>
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="text-red-600 cursor-pointer hover:bg-red-50">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Cerrar Sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
