import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { Logger } from '@nestjs/common'

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/alerts',
})
export class AlertsGateway
  implements OnGatewayConnection, OnGatewayDisconnect {

  @WebSocketServer()
  server: Server

  private logger = new Logger('AlertsGateway')

  // Connexion d'un client
  handleConnection(client: Socket) {
    this.logger.log(`Client connecté : ${client.id}`)
  }

  // Déconnexion d'un client
  handleDisconnect(client: Socket) {
    this.logger.log(`Client déconnecté : ${client.id}`)
  }

  // Parent s'abonne aux alertes d'un enfant
  @SubscribeMessage('subscribe:child')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { childId: string },
  ) {
    const room = `child:${data.childId}`
    client.join(room)
    this.logger.log(`Client ${client.id} abonné à ${room}`)
    return { event: 'subscribed', room }
  }

  // Se désabonner
  @SubscribeMessage('unsubscribe:child')
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { childId: string },
  ) {
    const room = `child:${data.childId}`
    client.leave(room)
    return { event: 'unsubscribed', room }
  }

  // ── Méthodes appelées par AlertsService ──────────────────

  // Envoyer position live à tous les abonnés d'un enfant
  sendPositionUpdate(childId: string, position: any) {
    this.server
      .to(`child:${childId}`)
      .emit('position:update', { childId, position })
  }

  // Envoyer une alerte en temps réel
  sendAlert(childId: string, alert: any) {
    this.server
      .to(`child:${childId}`)
      .emit('alert:new', { childId, alert })
  }

  // Envoyer alerte AMBER à tous les clients connectés
  sendAmberAlert(missingReport: any) {
    this.server.emit('amber:alert', missingReport)
  }

  // Envoyer alerte SOS
  sendSosAlert(childId: string, data: any) {
    this.server
      .to(`child:${childId}`)
      .emit('sos:triggered', { childId, ...data })
    // Aussi en broadcast global (tous les admins voient le SOS)
    this.server.emit('sos:global', { childId, ...data })
  }
}