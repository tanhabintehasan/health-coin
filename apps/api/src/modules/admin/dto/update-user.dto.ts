import { IsString, IsOptional, IsInt, Min, Max, IsBoolean, Length, Matches } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @Length(5, 20)
  @IsOptional()
  @Matches(/^\d+$/, { message: 'Phone must contain only digits' })
  phone?: string;

  @IsString()
  @Length(6, 100)
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  @Length(1, 100)
  nickname?: string;

  @IsString()
  @IsOptional()
  @Length(1, 100)
  name?: string;

  @IsInt()
  @Min(1)
  @Max(6)
  @IsOptional()
  membershipLevel?: number;

  @IsString()
  @IsOptional()
  regionId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
