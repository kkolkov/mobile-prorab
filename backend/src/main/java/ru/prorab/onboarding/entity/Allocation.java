package ru.prorab.onboarding.entity;
import jakarta.persistence.*;
@Entity @Table(name="access_allocation")
public class Allocation { @Id public int id; public long nextNumber; }
