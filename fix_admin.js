import fs from 'fs';
import path from 'path';

const filePath = 'c:/Users/USUARIO/Downloads/PROYECTO_IA/argentina-2/src/pages/AdminPanel.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const targetStr = `                {!isSubAdmin && (
                  <>
                        <div className="mt-4 pt-3 border-t border-teal-400/30">`;

const replacementStr = `                {!isSubAdmin && (
                  <>
                    <TabsTrigger value="subaccounts">Subaccounts</TabsTrigger>
                    <TabsTrigger value="revisiones">Revisiones</TabsTrigger>
                    <TabsTrigger value="facturacion">Facturación</TabsTrigger>
                    <TabsTrigger value="seguridad">Seguridad</TabsTrigger>
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                    <TabsTrigger value="employees">Empleados</TabsTrigger>
                  </>
                )}
              </TabsList>

              {/* Tab Contents */}
              {!isSubAdmin && (
                <TabsContent value="dashboard" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
                    {/* Conversaciones Promedio - Teal/Azul */}
                    <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow overflow-hidden relative">
                      <CardContent className="p-5 relative z-10">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            {avgConversationsLoading ? (
                              <div className="flex items-center space-x-2 mb-1">
                                <div className="h-6 w-6 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                                <span className="text-2xl font-bold">...</span>
                              </div>
                            ) : (
                              <h3 className="text-3xl font-bold mb-1">{avgConversations}</h3>
                            )}
                            <p className="text-sm text-teal-50 opacity-90">Conversaciones Promedio</p>
                          </div>
                          <div className="opacity-20">
                            <MessagesSquare className="h-16 w-16" />
                          </div>
                        </div>
                        <div className="mt-4 pt-3 border-t border-teal-400/30">`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replacementStr);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully fixed AdminPanel.tsx');
} else {
  console.log('Target string not found');
}
