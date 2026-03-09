import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { ShopService } from './shop.service';

@ApiTags('shop')
@Controller('shop')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Get()
  @ApiOperation({ summary: 'Get all approved shop listings' })
  findApproved() {
    return this.shopService.findApproved();
  }

  @Get('pending')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get pending submissions (admin only)' })
  findPending(@CurrentUser() user: User) {
    return this.shopService.findPending(user);
  }

  @Post('submit/:listId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a card list to the shop' })
  submit(@Param('listId', ParseUUIDPipe) listId: string, @CurrentUser() user: User) {
    return this.shopService.submit(listId, user);
  }

  @Post(':id/approve')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a submission (admin only)' })
  approve(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.shopService.approve(id, user);
  }

  @Post(':id/reject')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a submission (admin only)' })
  @HttpCode(HttpStatus.OK)
  reject(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.shopService.reject(id, user);
  }

  @Post(':id/import')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Import an approved shop list to your lists' })
  importToMyLists(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.shopService.importToMyLists(id, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete own submission (or any, if admin)' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.shopService.remove(id, user);
  }
}
